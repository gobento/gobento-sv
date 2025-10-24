// src/lib/server/notifications.ts
import { db } from '$lib/server/db';
import { locationSubscriptions, businessLocations, businessProfiles } from './schema';
import { eq, and } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

interface NotificationPayload {
	title: string;
	message: string;
	tags?: string[];
	priority?: 'min' | 'low' | 'default' | 'high' | 'urgent';
	click?: string; // URL to open when clicked
	actions?: Array<{
		action: string;
		label: string;
		url?: string;
	}>;
}

export async function sendNotification(topic: string, payload: NotificationPayload) {
	const ntfyServer = env.NTFY_SERVER || 'http://localhost:8080';

	try {
		const headers: Record<string, string> = {
			Title: payload.title,
			Message: payload.message,
			Priority: payload.priority || 'default'
		};

		if (payload.tags && payload.tags.length > 0) {
			headers['Tags'] = payload.tags.join(',');
		}

		if (payload.click) {
			headers['Click'] = payload.click;
		}

		if (payload.actions && payload.actions.length > 0) {
			payload.actions.forEach((action, index) => {
				headers[`Actions`] = payload
					.actions!.map((a) => `${a.action}, ${a.label}${a.url ? `, ${a.url}` : ''}`)
					.join('; ');
			});
		}

		const response = await fetch(`${ntfyServer}/${topic}`, {
			method: 'POST',
			body: payload.message,
			headers
		});

		if (!response.ok) {
			console.error('Failed to send notification:', await response.text());
			return false;
		}

		return true;
	} catch (error) {
		console.error('Error sending notification:', error);
		return false;
	}
}

export async function notifyNewOffer(
	locationId: string,
	offerName: string,
	offerPrice: number,
	currency: string,
	offerId: string
) {
	// Get location details
	const location = await db
		.select({
			name: businessLocations.name,
			city: businessLocations.city,
			businessAccountId: businessLocations.businessAccountId
		})
		.from(businessLocations)
		.where(eq(businessLocations.id, locationId))
		.limit(1);

	if (location.length === 0) return;

	const locationData = location[0];

	// Get business name
	const businesses = await db
		.select({ name: businessProfiles.name })
		.from(businessProfiles)
		.where(eq(businessProfiles.accountId, locationData.businessAccountId))
		.limit(1);

	if (businesses.length === 0) {
		throw error(404, 'Business not found');
	}

	const business = businesses[0];

	// Get all active subscriptions for this location
	const subscriptions = await db
		.select()
		.from(locationSubscriptions)
		.where(
			and(
				eq(locationSubscriptions.locationId, locationId),
				eq(locationSubscriptions.isActive, true)
			)
		);

	const priceFormatted = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency
	}).format(offerPrice);

	const notificationPayload: NotificationPayload = {
		title: `New Offer at ${business.name}`,
		message: `${offerName} - ${priceFormatted} at ${locationData.name}, ${locationData.city}`,
		tags: ['tada', 'shopping_bags'],
		priority: 'default',
		click: `${env.PUBLIC_APP_URL || 'http://localhost:5173'}/offers/${offerId}`,
		actions: [
			{
				action: 'view',
				label: 'View Offer',
				url: `${env.PUBLIC_APP_URL || 'http://localhost:5173'}/offers/${offerId}`
			}
		]
	};

	console.dir(notificationPayload);

	// Send notification to each subscriber
	const promises = subscriptions.map((sub) => sendNotification(sub.ntfyTopic, notificationPayload));

	await Promise.allSettled(promises);
}
