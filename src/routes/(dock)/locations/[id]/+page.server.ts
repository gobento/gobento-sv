// src/routes/(dock)/locations/[id]/+page.server.ts
import { db } from '$lib/server/db';
import {
	businessLocations,
	businessOffers,
	favoriteLocations,
	files,
	businessProfiles,
	accounts
} from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = locals.session;

	// Fetch the location
	const location = await db
		.select()
		.from(businessLocations)
		.where(eq(businessLocations.id, params.id))
		.limit(1);

	if (location.length === 0) {
		throw error(404, 'Location not found');
	}

	const locationData = location[0];

	// Check if current user is the owner
	const isOwner = locationData.businessAccountId === session.accountId;

	// Fetch the business profile for this location
	const business = await db
		.select({
			name: businessProfiles.name,
			logo: files
		})
		.from(businessProfiles)
		.where(eq(businessProfiles.accountId, locationData.businessAccountId))
		.leftJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.limit(1);

	// Fetch location image if exists
	let locationImage = null;
	if (locationData.imageId) {
		const image = await db.select().from(files).where(eq(files.id, locationData.imageId)).limit(1);

		if (image.length > 0) {
			locationImage = image[0];
		}
	}

	// Fetch offers for this location
	const offers = await db
		.select()
		.from(businessOffers)
		.where(eq(businessOffers.locationId, params.id))
		.orderBy(businessOffers.createdAt);

	// Check if current account is a user
	const account = await db
		.select()
		.from(accounts)
		.where(eq(accounts.id, session.accountId))
		.limit(1);

	const isUser = account.length > 0 && account[0].accountType === 'user';

	// Check if location is favorited by current user (only for users)
	let isFavorite = false;
	if (isUser) {
		const favorite = await db
			.select()
			.from(favoriteLocations)
			.where(
				and(
					eq(favoriteLocations.accountId, session.accountId),
					eq(favoriteLocations.locationId, params.id)
				)
			)
			.limit(1);

		isFavorite = favorite.length > 0;
	}

	return {
		location: locationData,
		offers,
		business: business[0] || null,
		locationImage,
		isOwner,
		isUser,
		isFavorite
	};
};

export const actions: Actions = {
	addFavorite: async ({ params, locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

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

		// Add to favorites
		try {
			await db.insert(favoriteLocations).values({
				accountId: session.accountId,
				locationId: params.id
			});

			return { success: true };
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

		// Delete from favorites
		try {
			await db
				.delete(favoriteLocations)
				.where(
					and(
						eq(favoriteLocations.accountId, session.accountId),
						eq(favoriteLocations.locationId, params.id)
					)
				);

			return { success: true };
		} catch (err) {
			console.error('Error removing favorite:', err);
			return fail(500, { error: 'Failed to remove favorite' });
		}
	}
};
