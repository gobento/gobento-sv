const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

// Install event - cache assets
sw.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

// Activate event - delete old caches
sw.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

// Fetch event - serve from cache, fallback to network
sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// Try cache first
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);
			if (response) return response;
		}

		// Try network
		try {
			const response = await fetch(event.request);
			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}
			return response;
		} catch {
			const response = await cache.match(url.pathname);
			if (response) return response;
		}
	}

	event.respondWith(respond());
});

// Listen for ntfy subscription messages
let ntfyConnection = null;
let currentTopic = null;
let ntfyServerUrl = 'http://localhost:8080';

sw.addEventListener('message', (event) => {
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
