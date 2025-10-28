// src/lib/client/notificationScheduler.ts

/**
 * Schedule a notification to be shown at a specific time via Service Worker
 */
export async function scheduleNotification(options: {
	id?: string;
	title: string;
	body: string;
	scheduledTime: Date | string;
	url?: string;
	icon?: string;
	badge?: string;
	tag?: string;
	requireInteraction?: boolean;
	vibrate?: number[];
}) {
	if (!('serviceWorker' in navigator)) {
		throw new Error('Service Worker not supported');
	}

	const registration = await navigator.serviceWorker.ready;

	// Request notification permission if not granted
	if (Notification.permission !== 'granted') {
		const permission = await Notification.requestPermission();
		if (permission !== 'granted') {
			throw new Error('Notification permission denied');
		}
	}

	return new Promise((resolve, reject) => {
		const messageChannel = new MessageChannel();

		messageChannel.port1.onmessage = (event) => {
			if (event.data.success) {
				resolve(event.data);
			} else {
				reject(new Error('Failed to schedule notification'));
			}
		};

		registration.active?.postMessage(
			{
				type: 'SCHEDULE_NOTIFICATION',
				id: options.id || `notification-${Date.now()}`,
				title: options.title,
				body: options.body,
				scheduledTime:
					typeof options.scheduledTime === 'string'
						? options.scheduledTime
						: options.scheduledTime.toISOString(),
				data: {
					url: options.url || '/'
				},
				icon: options.icon,
				badge: options.badge,
				tag: options.tag,
				requireInteraction: options.requireInteraction,
				vibrate: options.vibrate
			},
			[messageChannel.port2]
		);
	});
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(id: string) {
	if (!('serviceWorker' in navigator)) {
		return false;
	}

	const registration = await navigator.serviceWorker.ready;

	return new Promise((resolve, reject) => {
		const messageChannel = new MessageChannel();

		messageChannel.port1.onmessage = (event) => {
			if (event.data.success) {
				resolve(true);
			} else {
				reject(false);
			}
		};

		registration.active?.postMessage(
			{
				type: 'CANCEL_SCHEDULED_NOTIFICATION',
				id
			},
			[messageChannel.port2]
		);
	});
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<any[]> {
	if (!('serviceWorker' in navigator)) {
		return [];
	}

	const registration = await navigator.serviceWorker.ready;

	return new Promise((resolve, reject) => {
		const messageChannel = new MessageChannel();

		messageChannel.port1.onmessage = (event) => {
			if (event.data.success) {
				resolve(event.data.notifications || []);
			} else {
				reject([]);
			}
		};

		registration.active?.postMessage(
			{
				type: 'GET_SCHEDULED_NOTIFICATIONS'
			},
			[messageChannel.port2]
		);
	});
}
