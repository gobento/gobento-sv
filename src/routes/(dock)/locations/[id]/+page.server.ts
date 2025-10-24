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
import { url } from 'valibot';
import { getSignedDownloadUrl } from '$lib/server/backblaze';

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

	// Fetch location image if exists
	let locationImage = null;
	if (location.imageId) {
		const image = await db.select().from(files).where(eq(files.id, location.imageId)).limit(1);

		if (image.length > 0) {
			locationImage = { ...image[0], url: await getSignedDownloadUrl(image[0].key, 3600) };
		}
	}

	// Fetch offers for this location
	const offers = await db
		.select()
		.from(businessOffers)
		.where(eq(businessOffers.locationId, params.id))
		.orderBy(businessOffers.createdAt);

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

	//	const locationLogoUrl = await getSignedDownloadUrl(!.key, 3600); // 1 hour expiry
	const logoUrl = await getSignedDownloadUrl(business.logo!.key, 3600); // 1 hour expiry

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
