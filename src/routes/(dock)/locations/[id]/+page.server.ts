// src/routes/(dock)/locations/[id]/+page.server.ts
import { db } from '$lib/server/db';
import {
	businessLocations,
	businessOffers,
	favoriteLocations,
	files,
	businessProfiles,
	accounts,
	pushSubscriptions,
	complaints
} from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getSignedDownloadUrl } from '$lib/server/backblaze';
import { randomUUID } from 'crypto';
import * as v from 'valibot';
import { complaintSchema, COMPLAINT_CATEGORY_LABELS } from '$lib/complaints';
import { notifyComplaint } from '$lib/server/notifications';

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const isUser = account.accountType === 'user';

	// Fetch the location
	const locations = await db
		.select()
		.from(businessLocations)
		.where(eq(businessLocations.id, params.id))
		.limit(1);

	if (locations.length === 0) {
		throw error(404, 'Location not found');
	}

	const location = locations[0];

	// Check if current user is the owner
	const isOwner = location.businessAccountId === account.id;

	// Fetch the business profile for this location
	const businesses = await db
		.select({
			name: businessProfiles.name,
			logo: files
		})
		.from(businessProfiles)
		.where(eq(businessProfiles.accountId, location.businessAccountId))
		.leftJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.limit(1);

	if (businesses.length === 0) {
		throw error(404, 'Business not found');
	}

	const business = businesses[0];

	const image = await db.select().from(files).where(eq(files.id, location.imageId)).limit(1);
	const locationImage = { ...image[0], url: await getSignedDownloadUrl(image[0].key) };

	// Fetch offers for this location (with their image keys)
	const offerRows = await db
		.select({
			id: businessOffers.id,
			name: businessOffers.name,
			description: businessOffers.description,
			originalValue: businessOffers.originalValue,
			price: businessOffers.price,
			currency: businessOffers.currency,
			isActive: businessOffers.isActive,
			isRecurring: businessOffers.isRecurring,
			validUntil: businessOffers.validUntil,
			quantity: businessOffers.quantity,
			pickupTimeFrom: businessOffers.pickupTimeFrom,
			pickupTimeUntil: businessOffers.pickupTimeUntil,
			createdAt: businessOffers.createdAt,
			imageKey: files.key
		})
		.from(businessOffers)
		.leftJoin(files, eq(businessOffers.imageId, files.id))
		.where(eq(businessOffers.locationId, params.id))
		.orderBy(businessOffers.createdAt);

	// Generate signed URLs for each offer's image
	const offers = await Promise.all(
		offerRows.map(async ({ imageKey, ...offer }) => ({
			...offer,
			imageUrl: imageKey ? await getSignedDownloadUrl(imageKey) : null
		}))
	);

	// Check if location is favorited by current user (only for users)
	let isFavorite = false;
	if (isUser) {
		const favorite = await db
			.select()
			.from(favoriteLocations)
			.where(
				and(
					eq(favoriteLocations.accountId, account.id),
					eq(favoriteLocations.locationId, params.id)
				)
			)
			.limit(1);

		isFavorite = favorite.length > 0;
	}

	const logoUrl = await getSignedDownloadUrl(business.logo!.key);

	return {
		location: { ...location, logo: { url: locationImage?.url } },
		offers,
		business: { ...business, logo: { url: logoUrl } },
		locationImage,
		isOwner,
		isUser,
		isFavorite
	};
};

export const actions: Actions = {
	submitComplaint: async ({ params, locals, request }) => {
		const account = locals.account!;

		if (account.accountType !== 'user') {
			return fail(403, { complaint: { error: 'Only users can report a problem' } });
		}

		const formData = await request.formData();
		const parsed = v.safeParse(complaintSchema, {
			category: formData.get('category'),
			message: formData.get('message')
		});

		if (!parsed.success) {
			return fail(400, {
				complaint: { error: parsed.issues[0]?.message ?? 'Please check your input and try again' }
			});
		}

		const [location] = await db
			.select({
				id: businessLocations.id,
				name: businessLocations.name,
				businessAccountId: businessLocations.businessAccountId
			})
			.from(businessLocations)
			.where(eq(businessLocations.id, params.id))
			.limit(1);

		if (!location) {
			return fail(404, { complaint: { error: 'Location not found' } });
		}

		try {
			await db.insert(complaints).values({
				id: randomUUID(),
				reporterAccountId: account.id,
				businessAccountId: location.businessAccountId,
				targetType: 'location',
				locationId: location.id,
				category: parsed.output.category,
				message: parsed.output.message
			});

			await notifyComplaint({
				businessAccountId: location.businessAccountId,
				targetType: 'location',
				targetName: location.name,
				categoryLabel: COMPLAINT_CATEGORY_LABELS[parsed.output.category]
			});

			return { complaint: { success: true } };
		} catch (err) {
			console.error('Error submitting complaint:', err);
			return fail(500, { complaint: { error: 'Failed to submit complaint. Please try again.' } });
		}
	},

	addFavorite: async ({ params, locals }) => {
		const session = locals.session!;

		// Verify account is a user
		const account = await db
			.select()
			.from(accounts)
			.where(eq(accounts.id, session.accountId))
			.limit(1);

		if (account.length === 0 || account[0].accountType !== 'user') {
			return fail(403, { error: 'Only users can favorite locations' });
		}

		// Verify location exists
		const location = await db
			.select()
			.from(businessLocations)
			.where(eq(businessLocations.id, params.id))
			.limit(1);

		if (location.length === 0) {
			return fail(404, { error: 'Location not found' });
		}

		// Check if already favorited
		const existing = await db
			.select()
			.from(favoriteLocations)
			.where(
				and(
					eq(favoriteLocations.accountId, session.accountId),
					eq(favoriteLocations.locationId, params.id)
				)
			)
			.limit(1);

		if (existing.length > 0) {
			return fail(400, { error: 'Location already favorited' });
		}

		try {
			// Ensure user has a push subscription
			const existingSubscription = await db
				.select()
				.from(pushSubscriptions)
				.where(eq(pushSubscriptions.accountId, session.accountId))
				.limit(1);

			if (existingSubscription.length === 0) {
				// Create a push subscription for this user with a unique topic
				const ntfyTopic = `user-${session.accountId}-${randomUUID().slice(0, 8)}`;
				await db.insert(pushSubscriptions).values({
					id: randomUUID(),
					accountId: session.accountId,
					ntfyTopic,
					isActive: true
				});
				console.log(
					`✓ Created push subscription for user ${session.accountId} with topic ${ntfyTopic}`
				);
			} else if (!existingSubscription[0].isActive) {
				// Reactivate existing subscription
				await db
					.update(pushSubscriptions)
					.set({ isActive: true })
					.where(eq(pushSubscriptions.accountId, session.accountId));
				console.log(`✓ Reactivated push subscription for user ${session.accountId}`);
			} else {
				console.log(`✓ User ${session.accountId} already has active push subscription`);
			}

			// Add to favorites
			await db.insert(favoriteLocations).values({
				accountId: session.accountId,
				locationId: params.id
			});

			console.log(`✓ Added location ${params.id} to favorites for user ${session.accountId}`);

			// Return success with subscription state
			return { success: true, subscribed: true };
		} catch (err) {
			console.error('Error adding favorite:', err);
			return fail(500, { error: 'Failed to add favorite' });
		}
	},

	removeFavorite: async ({ params, locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			// Delete from favorites
			await db
				.delete(favoriteLocations)
				.where(
					and(
						eq(favoriteLocations.accountId, session.accountId),
						eq(favoriteLocations.locationId, params.id)
					)
				);

			console.log(`✓ Removed location ${params.id} from favorites for user ${session.accountId}`);

			// Check if user has any other favorites left
			const remainingFavorites = await db
				.select()
				.from(favoriteLocations)
				.where(eq(favoriteLocations.accountId, session.accountId))
				.limit(1);

			// If no favorites left, deactivate push subscription
			if (remainingFavorites.length === 0) {
				await db
					.update(pushSubscriptions)
					.set({ isActive: false })
					.where(eq(pushSubscriptions.accountId, session.accountId));

				console.log(
					`✓ Deactivated push subscription for user ${session.accountId} (no favorites left)`
				);
			}

			// Return success with subscription state
			return { success: true, subscribed: false };
		} catch (err) {
			console.error('Error removing favorite:', err);
			return fail(500, { error: 'Failed to remove favorite' });
		}
	}
};
