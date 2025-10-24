// src/lib/server/notifications.ts
import { db } from '$lib/server/db';
import {
	favoriteLocations,
	businessLocations,
	businessProfiles,
	pushSubscriptions
} from './schema';
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
		// Format actions according to ntfy spec: "action=<action>, label=<label>, url=<url>"
		const formattedActions = payload.actions?.map((a) => {
			const parts = [`action=${a.action}`, `label=${a.label}`];
			if (a.url) {
				parts.push(`url=${a.url}`);
			}
			return parts.join(', ');
		});

		const body = {
			topic: topic,
			title: payload.title,
			message: payload.message,
			priority: payload.priority || 'default',
			tags: payload.tags || [],
			...(payload.click && { click: payload.click }),
			...(formattedActions && formattedActions.length > 0 && { actions: formattedActions })
		};

		console.log('Sending to ntfy:', JSON.stringify(body, null, 2));

		const response = await fetch(ntfyServer, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		const responseText = await response.text();

		if (!response.ok) {
			console.error('Failed to send notification:', responseText);
			console.error('Request body was:', JSON.stringify(body, null, 2));
			return false;
		}

		console.log('Notification sent successfully:', responseText);
		return true;
	} catch (err) {
		console.error('Error sending notification:', err);
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

	// Get all users who have favorited this location AND have active push subscriptions
	const subscribers = await db
		.select({
			accountId: favoriteLocations.accountId,
			ntfyTopic: pushSubscriptions.ntfyTopic
		})
		.from(favoriteLocations)
		.innerJoin(pushSubscriptions, eq(favoriteLocations.accountId, pushSubscriptions.accountId))
		.where(and(eq(favoriteLocations.locationId, locationId), eq(pushSubscriptions.isActive, true)));

	if (subscribers.length === 0) {
		console.log(`No subscribers found for location ${locationId}`);
		return;
	}

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

	console.log(
		`Sending notifications to ${subscribers.length} subscribers for location ${locationId}`
	);
	console.dir(notificationPayload);

	// Send notification to each subscriber
	const promises = subscribers.map((sub) => sendNotification(sub.ntfyTopic, notificationPayload));

	const results = await Promise.allSettled(promises);

	const successCount = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
	console.log(`Sent ${successCount}/${subscribers.length} notifications successfully`);
}
