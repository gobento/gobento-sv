import {
	scheduleNotification,
	cancelScheduledNotification
} from '#lib/client/notificationScheduler.js';

const ICON = '/icon-192.png';
const BADGE = '/badge-96.png';
const MINUTE = 60 * 1000;

/**
 * Schedules the pickup reminders for a reservation: one hour before, thirty
 * minutes before, and when the pickup window opens. Reminders whose time has
 * already passed are skipped. Returns how many were scheduled.
 */
export async function schedulePickupNotifications(options: {
	reservationId: string;
	pickupDate: string | Date;
	offerName: string;
	locationName?: string;
}): Promise<{ success: boolean; scheduledCount: number; error?: string }> {
	const pickupTime = new Date(options.pickupDate);
	const now = Date.now();
	if (pickupTime.getTime() <= now) {
		return { success: false, scheduledCount: 0, error: 'Pickup time is in the past' };
	}

	const url = `/reservations/${options.reservationId}`;
	const where = options.locationName ? ` at ${options.locationName}` : '';
	const reminders = [
		{
			id: `reminder-1hour-${options.reservationId}`,
			title: 'Pickup in 1 hour',
			body: `Don't forget: ${options.offerName}${where}`,
			scheduledTime: new Date(pickupTime.getTime() - 60 * MINUTE)
		},
		{
			id: `reminder-30min-${options.reservationId}`,
			title: 'Pickup in 30 minutes',
			body: `${options.offerName}${where} is almost ready`,
			scheduledTime: new Date(pickupTime.getTime() - 30 * MINUTE),
			vibrate: [200, 100, 200]
		},
		{
			id: `pickup-${options.reservationId}`,
			title: 'Ready for pickup',
			body: `You can collect ${options.offerName}${where} now`,
			scheduledTime: pickupTime,
			requireInteraction: true,
			vibrate: [200, 100, 200, 100, 200]
		}
	].filter((reminder) => reminder.scheduledTime.getTime() > now);

	try {
		await Promise.all(
			reminders.map((reminder) =>
				scheduleNotification({ ...reminder, url, icon: ICON, badge: BADGE, tag: reminder.id })
			)
		);
		return { success: true, scheduledCount: reminders.length };
	} catch (error) {
		return {
			success: false,
			scheduledCount: 0,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/** Cancels every reminder of a reservation, e.g. once the food is collected. */
export async function cancelPickupNotifications(reservationId: string): Promise<void> {
	await Promise.all([
		cancelScheduledNotification(`pickup-${reservationId}`),
		cancelScheduledNotification(`reminder-30min-${reservationId}`),
		cancelScheduledNotification(`reminder-1hour-${reservationId}`)
	]);
}

/** 'unsupported' when the browser has no Notification API. */
export function notificationPermission(): NotificationPermission | 'unsupported' {
	return 'Notification' in window ? Notification.permission : 'unsupported';
}

/** Asks for notification permission if it has not been decided yet. */
export async function requestNotificationPermission(): Promise<boolean> {
	if (!('Notification' in window)) return false;
	if (Notification.permission !== 'default') return Notification.permission === 'granted';
	return (await Notification.requestPermission()) === 'granted';
}
