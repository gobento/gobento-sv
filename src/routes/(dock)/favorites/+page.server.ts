// src/routes/(dock)/favorites/+page.server.ts
import { db } from '$lib/server/db';
import {
	favoriteLocations,
	businessLocations,
	businessProfiles,
	businessOffers,
	files
} from '$lib/server/schema';
import { eq, and, count } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getSignedDownloadUrl } from '$lib/server/backblaze';

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'user') {
		throw error(403, 'Only users can view favorites');
	}

	// Fetch all favorite locations with business info
	const favorites = await db
		.select({
			locationId: favoriteLocations.locationId,
			favoritedAt: favoriteLocations.createdAt,
			location: businessLocations,
			businessName: businessProfiles.name,
			businessLogo: files
		})
		.from(favoriteLocations)
		.where(eq(favoriteLocations.accountId, account.id))
		.innerJoin(businessLocations, eq(favoriteLocations.locationId, businessLocations.id))
		.innerJoin(
			businessProfiles,
			eq(businessLocations.businessAccountId, businessProfiles.accountId)
		)
		.leftJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.orderBy(favoriteLocations.createdAt);

	// Fetch location images for all favorites
	const locationImages = await db
		.select({
			locationId: businessLocations.id,
			image: files
		})
		.from(businessLocations)
		.innerJoin(files, eq(businessLocations.imageId, files.id))
		.where(eq(businessLocations.id, favorites.length > 0 ? favorites[0].locationId : ''));

	// Create a map of location images
	const imageMap = new Map(locationImages.map((img) => [img.locationId, img.image]));

	// Fetch offer counts for each location
	const offerCounts = await Promise.all(
		favorites.map(async (fav) => {
			const result = await db
				.select({ count: count() })
				.from(businessOffers)

				.where(eq(businessOffers.locationId, fav.locationId));

			return {
				locationId: fav.locationId,
				count: result[0].count
			};
		})
	);

	const offerCountMap = new Map(offerCounts.map((oc) => [oc.locationId, oc.count]));

	return {
		favorites: await Promise.all(
			favorites.map(async (fav) => {
				const logoUrl = fav.businessLogo
					? await getSignedDownloadUrl(fav.businessLogo.key, 3600)
					: null;

				return {
					...fav,
					locationImage: imageMap.get(fav.locationId) || null,
					offerCount: offerCountMap.get(fav.locationId) || 0,
					business: {
						logo: logoUrl ? { url: logoUrl } : null
					}
				};
			})
		)
	};
};

export const actions: Actions = {
	removeFavorite: async ({ request, locals }) => {
		const account = locals.account!;
		if (account.accountType !== 'user') {
			return fail(403, { error: 'Only users can remove favorites' });
		}

		const formData = await request.formData();
		const locationId = formData.get('locationId') as string;

		if (!locationId) {
			return fail(400, { error: 'Location ID required' });
		}

		try {
			await db
				.delete(favoriteLocations)
				.where(
					and(
						eq(favoriteLocations.accountId, account.id),
						eq(favoriteLocations.locationId, locationId)
					)
				);

			return { success: true };
		} catch (err) {
			console.error('Error removing favorite:', err);
			return fail(500, { error: 'Failed to remove favorite' });
		}
	}
};
