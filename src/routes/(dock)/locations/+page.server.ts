// src/routes/(dock)/locations/+page.server.ts
import { db } from '$lib/server/db';
import { businessLocations, businessOffers, files } from '$lib/server/schema';
import { eq, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSignedDownloadUrl } from '$lib/server/backblaze';

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'business') {
		throw error(403, 'Only business accounts can access locations');
	}

	// Fetch all locations for this business with their images
	const locations = await db
		.select({
			id: businessLocations.id,
			name: businessLocations.name,
			address: businessLocations.address,
			city: businessLocations.city,
			province: businessLocations.province,
			zipCode: businessLocations.zipCode,
			country: businessLocations.country,
			latitude: businessLocations.latitude,
			longitude: businessLocations.longitude,
			imageId: businessLocations.imageId,
			createdAt: businessLocations.createdAt,
			image: files
		})
		.from(businessLocations)
		.leftJoin(files, eq(businessLocations.imageId, files.id))
		.where(eq(businessLocations.businessAccountId, account.id))
		.orderBy(businessLocations.createdAt);

	// Fetch offer counts for each location
	const offerCounts = await db
		.select({
			locationId: businessOffers.locationId,
			count: sql<number>`count(*)::int`
		})
		.from(businessOffers)
		.where(eq(businessOffers.businessAccountId, account.id))
		.groupBy(businessOffers.locationId);

	// Create a map of location-specific offers
	const offerCountMap = new Map<string, number>();
	let allLocationsOfferCount = 0;

	for (const item of offerCounts) {
		if (item.locationId === null) {
			allLocationsOfferCount = item.count;
		} else {
			offerCountMap.set(item.locationId, item.count);
		}
	}

	// Add offer counts and signed image URLs to locations
	const locationsWithOffers = await Promise.all(
		locations.map(async (loc) => {
			let imageUrl = null;
			if (loc.image) {
				imageUrl = await getSignedDownloadUrl(loc.image.key, 3600);
			}

			return {
				id: loc.id,
				name: loc.name,
				address: loc.address,
				city: loc.city,
				province: loc.province,
				zipCode: loc.zipCode,
				country: loc.country,
				latitude: loc.latitude,
				longitude: loc.longitude,
				imageId: loc.imageId,
				createdAt: loc.createdAt,
				imageUrl,
				offerCount: (offerCountMap.get(loc.id) || 0) + allLocationsOfferCount
			};
		})
	);

	return {
		locations: locationsWithOffers,
		allLocationsOfferCount
	};
};
