// /src/service-worker.js
import { build, files, version } from '$service-worker';
import { precacheAndRoute } from 'workbox-precaching';

// Required for injectManifest strategy
//const manifest = self.__WB_MANIFEST;

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

// Precache assets using Workbox
precacheAndRoute([
	...self.__WB_MANIFEST,
	...ASSETS.map((url) => ({
		url,
		revision: version
	}))
]);

// Listen for ntfy subscription messages
let ntfyConnection = null;
let currentTopic = null;
let ntfyServerUrl = 'http://localhost:8080'; // Default

self.addEventListener('message', (event) => {
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

			// Only show message events (not open/keepalive)
			if (data.event === 'message') {
				console.log('Received notification:', data);

				self.registration.showNotification(data.title || 'New Message', {
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

		// Reconnect after 5 seconds
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
self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const urlToOpen = event.notification.data?.url || '/';

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
			for (let client of windowClients) {
				if (client.url === urlToOpen && 'focus' in client) {
					return client.focus();
				}
			}
			if (self.clients.openWindow) {
				return self.clients.openWindow(urlToOpen);
			}
		})
	);
});
