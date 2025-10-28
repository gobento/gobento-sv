// src/lib/client/schedulePickupNotifications.ts
import {
	scheduleNotification,
	cancelScheduledNotification
} from '$lib/client/notificationScheduler';

/**
 * Schedule pickup notifications after successful payment
 * This runs client-side and works offline via Service Worker
 */
export async function schedulePickupNotifications(options: {
	reservationId: string;
	pickupDate: string | Date;
	offerName: string;
	locationName?: string;
}) {
	try {
		const pickupTime = new Date(options.pickupDate);
		const now = new Date();

		// Validate pickup time is in the future
		if (pickupTime <= now) {
			console.warn('Pickup time is in the past, skipping notification scheduling');
			return { success: false, error: 'Pickup time is in the past' };
		}

		const notifications = [];

		// Schedule main pickup notification
		const mainNotification = await scheduleNotification({
			id: `pickup-${options.reservationId}`,
			title: '⏰ Pickup Time!',
			body: `It's time to pick up your order: ${options.offerName}${
				options.locationName ? ` at ${options.locationName}` : ''
			}`,
			scheduledTime: pickupTime,
			url: `/reservations/${options.reservationId}`,
			icon: '/icon-192.png',
			badge: '/icon-192.png',
			tag: `pickup-${options.reservationId}`,
			requireInteraction: true, // Keep notification visible until dismissed
			vibrate: [200, 100, 200, 100, 200]
		});

		notifications.push(mainNotification);
		console.log('Main pickup notification scheduled for:', pickupTime);

		// Schedule 30-minute reminder (only if pickup is more than 30 minutes away)
		const reminderTime = new Date(pickupTime.getTime() - 30 * 60 * 1000);
		if (reminderTime > now) {
			const reminderNotification = await scheduleNotification({
				id: `reminder-30min-${options.reservationId}`,
				title: '🔔 Pickup Reminder',
				body: `Your order "${options.offerName}" pickup is in 30 minutes`,
				scheduledTime: reminderTime,
				url: `/reservations/${options.reservationId}`,
				icon: '/icon-192.png',
				badge: '/icon-192.png',
				tag: `reminder-${options.reservationId}`,
				vibrate: [200, 100, 200]
			});

			notifications.push(reminderNotification);
			console.log('30-minute reminder scheduled for:', reminderTime);
		}

		// Schedule 1-hour reminder (only if pickup is more than 1 hour away)
		const hourReminderTime = new Date(pickupTime.getTime() - 60 * 60 * 1000);
		if (hourReminderTime > now) {
			const hourReminderNotification = await scheduleNotification({
				id: `reminder-1hour-${options.reservationId}`,
				title: '🕐 Pickup in 1 Hour',
				body: `Don't forget: ${options.offerName} pickup in 1 hour`,
				scheduledTime: hourReminderTime,
				url: `/reservations/${options.reservationId}`,
				icon: '/icon-192.png',
				badge: '/icon-192.png',
				tag: `reminder-hour-${options.reservationId}`
			});

			notifications.push(hourReminderNotification);
			console.log('1-hour reminder scheduled for:', hourReminderTime);
		}

		return {
			success: true,
			scheduledCount: notifications.length,
			notifications
		};
	} catch (error) {
		console.error('Failed to schedule pickup notifications:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Cancel all scheduled notifications for a reservation
 * Useful when a reservation is cancelled or modified
 */
export async function cancelPickupNotifications(reservationId: string) {
	try {
		await Promise.all([
			cancelScheduledNotification(`pickup-${reservationId}`),
			cancelScheduledNotification(`reminder-30min-${reservationId}`),
			cancelScheduledNotification(`reminder-1hour-${reservationId}`)
		]);

		console.log('Cancelled all notifications for reservation:', reservationId);
		return { success: true };
	} catch (error) {
		console.error('Failed to cancel notifications:', error);
		return { success: false, error };
	}
}

/**
 * Check if notifications are supported and permission is granted
 */
export function checkNotificationSupport(): {
	supported: boolean;
	permission: NotificationPermission | null;
	serviceWorkerSupported: boolean;
} {
	return {
		supported: 'Notification' in window,
		permission: 'Notification' in window ? Notification.permission : null,
		serviceWorkerSupported: 'serviceWorker' in navigator
	};
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
	if (!('Notification' in window)) {
		console.warn('Notifications not supported');
		return false;
	}

	if (Notification.permission === 'granted') {
		return true;
	}

	if (Notification.permission === 'denied') {
		console.warn('Notification permission denied');
		return false;
	}

	const permission = await Notification.requestPermission();
	return permission === 'granted';
}
