const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const DB_NAME = 'scheduled-notifications';
const DB_VERSION = 1;
const STORE_NAME = 'notifications';

const IMAGE_CACHE_NAME = 'image-cache-v1';
const MAX_IMAGE_CACHE_SIZE = 50; // Maximum number of images to cache

// IndexedDB helper functions
async function openDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = event.target.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
				store.createIndex('scheduledTime', 'scheduledTime', { unique: false });
			}
		};
	});
}

async function saveScheduledNotification(notification) {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const request = store.put(notification);

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function getScheduledNotifications() {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const store = tx.objectStore(STORE_NAME);
		const request = store.getAll();

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function deleteScheduledNotification(id) {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const request = store.delete(id);

		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

// Image caching utilities
async function cleanupImageCache() {
	try {
		const cache = await caches.open(IMAGE_CACHE_NAME);
		const keys = await cache.keys();

		if (keys.length > MAX_IMAGE_CACHE_SIZE) {
			// Remove oldest entries (first in, first out)
			const toDelete = keys.slice(0, keys.length - MAX_IMAGE_CACHE_SIZE);
			await Promise.all(toDelete.map((key) => cache.delete(key)));
		}
	} catch (error) {
		console.error('Cache cleanup failed:', error);
	}
}

// Intercept fetch requests for images
sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Cache images from Backblaze or image endpoints
	if (
		event.request.destination === 'image' ||
		url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i) ||
		url.hostname.includes('backblazeb2.com') ||
		url.hostname.includes('b2-api.com')
	) {
		event.respondWith(
			caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
				try {
					// Try cache first
					const cached = await cache.match(event.request);
					if (cached) {
						// Return cached version immediately
						return cached;
					}

					// Fetch from network
					const response = await fetch(event.request);

					// Only cache successful responses
					if (response.ok) {
						// Clone the response before caching
						cache.put(event.request, response.clone());

						// Cleanup old entries
						cleanupImageCache();
					}

					return response;
				} catch (error) {
					// If network fails, try to return cached version
					const cached = await cache.match(event.request);
					if (cached) {
						return cached;
					}
					throw error;
				}
			})
		);
		return;
	}
});

// Check and show due notifications
async function checkScheduledNotifications() {
	const now = Date.now();
	const notifications = await getScheduledNotifications();

	for (const notification of notifications) {
		if (notification.scheduledTime <= now && !notification.shown) {
			// Show the notification
			await sw.registration.showNotification(notification.title, {
				body: notification.body,
				icon: notification.icon || '/icon-192.png',
				badge: notification.badge || '/icon-192.png',
				tag: notification.tag,
				data: notification.data,
				requireInteraction: notification.requireInteraction || false,
				vibrate: notification.vibrate || [200, 100, 200]
			});

			// Mark as shown and update
			notification.shown = true;
			await saveScheduledNotification(notification);

			// Delete after 24 hours to keep DB clean
			setTimeout(
				async () => {
					await deleteScheduledNotification(notification.id);
				},
				24 * 60 * 60 * 1000
			);
		}
	}
}

// Set up periodic check (every minute)
let checkInterval;

function startNotificationChecker() {
	if (checkInterval) clearInterval(checkInterval);

	checkInterval = setInterval(() => {
		checkScheduledNotifications();
	}, 60 * 1000); // Check every minute

	// Check immediately
	checkScheduledNotifications();
}

// Listen for messages from clients
let ntfyConnection = null;
let currentTopic = null;
let ntfyServerUrl = 'http://localhost:8080';

sw.addEventListener('message', (event) => {
	// Clear image cache
	if (event.data && event.data.type === 'CLEAR_IMAGE_CACHE') {
		event.waitUntil(
			caches.delete(IMAGE_CACHE_NAME).then(() => {
				console.log('Image cache cleared');
				event.ports[0]?.postMessage({ success: true });
			})
		);
		return;
	}

	// Schedule a notification
	if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
		const { id, title, body, scheduledTime, data, icon, badge, tag, requireInteraction, vibrate } =
			event.data;

		const notification = {
			id: id || `notification-${Date.now()}`,
			title,
			body,
			scheduledTime: new Date(scheduledTime).getTime(),
			data,
			icon,
			badge,
			tag,
			requireInteraction,
			vibrate,
			shown: false,
			createdAt: Date.now()
		};

		event.waitUntil(
			saveScheduledNotification(notification).then(() => {
				console.log('Notification scheduled for:', new Date(scheduledTime));
				event.ports[0]?.postMessage({ success: true, id: notification.id });
			})
		);
	}

	// Cancel a scheduled notification
	if (event.data && event.data.type === 'CANCEL_SCHEDULED_NOTIFICATION') {
		const { id } = event.data;
		event.waitUntil(
			deleteScheduledNotification(id).then(() => {
				console.log('Cancelled scheduled notification:', id);
				event.ports[0]?.postMessage({ success: true });
			})
		);
	}

	// Get all scheduled notifications
	if (event.data && event.data.type === 'GET_SCHEDULED_NOTIFICATIONS') {
		event.waitUntil(
			getScheduledNotifications().then((notifications) => {
				event.ports[0]?.postMessage({ success: true, notifications });
			})
		);
	}

	// NTFY subscription
	if (event.data && event.data.type === 'SUBSCRIBE_NTFY') {
		const { topic, serverUrl } = event.data;

		if (ntfyConnection) {
			ntfyConnection.close();
		}

		if (serverUrl) {
			ntfyServerUrl = serverUrl;
		}

		currentTopic = topic;
		subscribeToNtfy(topic);
	}

	if (event.data && event.data.type === 'UNSUBSCRIBE_NTFY') {
		if (ntfyConnection) {
			ntfyConnection.close();
			ntfyConnection = null;
			currentTopic = null;
		}
	}
});

function subscribeToNtfy(topic) {
	console.log(`Connecting to ${ntfyServerUrl}/${topic}/sse`);

	const eventSource = new EventSource(`${ntfyServerUrl}/${topic}/sse`);

	eventSource.onopen = () => {
		console.log('Connected to ntfy server');
	};

	eventSource.onmessage = (event) => {
		try {
			const data = JSON.parse(event.data);

			if (data.event === 'message') {
				console.log('Received notification:', data);

				sw.registration.showNotification(data.title || 'New Message', {
					body: data.message,
					icon: '/icon-192.png',
					badge: '/icon-192.png',
					tag: data.id,
					timestamp: data.time * 1000,
					data: {
						url: data.click || '/',
						actions: data.actions,
						raw: data
					}
				});
			}
		} catch (e) {
			console.error('Error parsing notification:', e);
		}
	};

	eventSource.onerror = (error) => {
		console.error('EventSource error:', error);
		eventSource.close();

		setTimeout(() => {
			if (currentTopic) {
				console.log('Reconnecting to ntfy...');
				subscribeToNtfy(currentTopic);
			}
		}, 5000);
	};

	ntfyConnection = eventSource;
}

// Handle notification clicks
sw.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const urlToOpen = event.notification.data?.url || '/';

	event.waitUntil(
		sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
			for (let client of windowClients) {
				if (client.url === urlToOpen && 'focus' in client) {
					return client.focus();
				}
			}
			if (sw.clients.openWindow) {
				return sw.clients.openWindow(urlToOpen);
			}
		})
	);
});

// Clean up old caches on activation
sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					// Keep current image cache, delete old versions
					if (cacheName.startsWith('image-cache-') && cacheName !== IMAGE_CACHE_NAME) {
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
});

// Start the checker when service worker starts
startNotificationChecker();
