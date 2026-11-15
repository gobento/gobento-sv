/**
 * Talks to the service worker, which stores scheduled notifications and shows
 * them at the right time even when the app is closed.
 */

export interface ScheduledNotificationOptions {
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
}

interface WorkerReply {
	success: boolean;
	id?: string;
	notifications?: unknown[];
}

const REPLY_TIMEOUT_MS = 4000;

/** The active worker, or null when none is registered (e.g. during development). */
async function activeWorker(): Promise<ServiceWorker | null> {
	if (!('serviceWorker' in navigator)) return null;
	// `serviceWorker.ready` never settles without a registration, so ask directly.
	const registration = await navigator.serviceWorker.getRegistration();
	return registration?.active ?? null;
}

function ask(worker: ServiceWorker, message: Record<string, unknown>): Promise<WorkerReply> {
	return new Promise((resolve, reject) => {
		const channel = new MessageChannel();
		const timer = setTimeout(
			() => reject(new Error('Service worker did not answer')),
			REPLY_TIMEOUT_MS
		);
		channel.port1.onmessage = (event: MessageEvent<WorkerReply>) => {
			clearTimeout(timer);
			if (event.data?.success) resolve(event.data);
			else reject(new Error('Service worker rejected the request'));
		};
		worker.postMessage(message, [channel.port2]);
	});
}

/** Schedules a notification for a specific time. Needs notification permission. */
export async function scheduleNotification(options: ScheduledNotificationOptions) {
	const worker = await activeWorker();
	if (!worker) throw new Error('Service worker not available');
	if (!('Notification' in window) || Notification.permission !== 'granted') {
		throw new Error('Notification permission not granted');
	}

	return ask(worker, {
		type: 'SCHEDULE_NOTIFICATION',
		id: options.id ?? `notification-${Date.now()}`,
		title: options.title,
		body: options.body,
		scheduledTime: new Date(options.scheduledTime).toISOString(),
		data: { url: options.url ?? '/' },
		icon: options.icon,
		badge: options.badge,
		tag: options.tag,
		requireInteraction: options.requireInteraction,
		vibrate: options.vibrate
	});
}

export async function cancelScheduledNotification(id: string): Promise<boolean> {
	const worker = await activeWorker();
	if (!worker) return false;
	try {
		await ask(worker, { type: 'CANCEL_SCHEDULED_NOTIFICATION', id });
		return true;
	} catch {
		return false;
	}
}

export async function getScheduledNotifications(): Promise<unknown[]> {
	const worker = await activeWorker();
	if (!worker) return [];
	try {
		const reply = await ask(worker, { type: 'GET_SCHEDULED_NOTIFICATIONS' });
		return reply.notifications ?? [];
	} catch {
		return [];
	}
}
