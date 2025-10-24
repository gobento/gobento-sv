// src/lib/server/notifications.ts
import { db } from '$lib/server/db';
import { businessLocations, businessProfiles, pushSubscriptions } from './schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { NTFY_SERVER } from '$env/static/private';

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
	try {
		// Use the simple message format with headers (more compatible)
		const headers: Record<string, string> = {
			Title: payload.title,
			Priority: payload.priority || 'default',
			Tags: payload.tags?.join(',') || ''
		};

		if (payload.click) {
			headers['Click'] = payload.click;
		}

		if (payload.actions && payload.actions.length > 0) {
			// Format actions as per ntfy spec: "action=view, label=View, url=..."
			payload.actions.forEach((action, index) => {
				const actionParts = [`action=${action.action}`, `label=${action.label}`];
				if (action.url) {
					actionParts.push(`url=${action.url}`);
				}
				headers[`Actions`] = actionParts.join(', ');
			});
		}

		const url = `${NTFY_SERVER}/${topic}`;
		console.log('Sending to ntfy:', url);
		console.log('Headers:', headers);
		console.log('Message:', payload.message);

		const response = await fetch(url, {
			method: 'POST',
			headers: headers,
			body: payload.message
		});

		let responseText: string;
		try {
			responseText = await response.text();
		} catch (e) {
			responseText = 'Could not read response: ' + e;
		}

		if (!response.ok) {
			console.error('Failed to send notification:', responseText);
			console.error('Response status:', response.status);
			return false;
		}

		console.log('Notification sent successfully:', responseText);
		return true;
	} catch (err) {
		console.error('Error sending notification:', err);
		return false;
	}
}

/**
 * Send notification to all active subscribers
 */
async function notifyAllSubscribers(payload: NotificationPayload) {
	// Get ALL users with active push subscriptions
	const subscribers = await db
		.select({
			accountId: pushSubscriptions.accountId,
			ntfyTopic: pushSubscriptions.ntfyTopic
		})
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.isActive, true));

	if (subscribers.length === 0) {
		console.log(`No active subscribers found`);
		return;
	}

	console.log(`Sending notifications to ${subscribers.length} active subscribers`);
	console.dir(payload);

	// Send notification to each subscriber
	const promises = subscribers.map((sub) => sendNotification(sub.ntfyTopic, payload));

	const results = await Promise.allSettled(promises);

	const successCount = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
	console.log(`Sent ${successCount}/${subscribers.length} notifications successfully`);
}

/**
 * Notify all active subscribers about a new offer at a specific location
 */
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

	if (location.length === 0) {
		console.log(`Location ${locationId} not found`);
		return;
	}

	const locationData = location[0];

	// Get business name
	const businesses = await db
		.select({ name: businessProfiles.name })
		.from(businessProfiles)
		.where(eq(businessProfiles.accountId, locationData.businessAccountId))
		.limit(1);

	if (businesses.length === 0) {
		console.log(`Business not found for location ${locationId}`);
		return;
	}

	const business = businesses[0];

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

	await notifyAllSubscribers(notificationPayload);
}

/**
 * Notify all active subscribers about a new offer that applies to all locations of a business
 */
export async function notifyNewOfferAllLocations(
	businessAccountId: string,
	offerName: string,
	offerPrice: number,
	currency: string,
	offerId: string
) {
	// Get business name
	const businesses = await db
		.select({ name: businessProfiles.name })
		.from(businessProfiles)
		.where(eq(businessProfiles.accountId, businessAccountId))
		.limit(1);

	if (businesses.length === 0) {
		console.log(`Business ${businessAccountId} not found`);
		return;
	}

	const business = businesses[0];

	const priceFormatted = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency
	}).format(offerPrice);

	const notificationPayload: NotificationPayload = {
		title: `New Offer at ${business.name}`,
		message: `${offerName} - ${priceFormatted} at all locations`,
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

	await notifyAllSubscribers(notificationPayload);
}
