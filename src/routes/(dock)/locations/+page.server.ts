// src/routes/locations/+page.server.ts
import { db } from '$lib/server/db';
import { businessLocations, businessOffers } from '$lib/server/schema';
import { eq, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const account = locals.account;

	if (!session || !account) {
		throw error(401, 'Unauthorized');
	}

	if (account.accountType !== 'business') {
		throw error(403, 'Only business accounts can access locations');
	}

	// Fetch all locations for this business
	const locations = await db
		.select({
			id: businessLocations.id,
			name: businessLocations.name,
			address: businessLocations.address,
			city: businessLocations.city,
			state: businessLocations.state,
			zipCode: businessLocations.zipCode,
			country: businessLocations.country,
			latitude: businessLocations.latitude,
			longitude: businessLocations.longitude,
			createdAt: businessLocations.createdAt
		})
		.from(businessLocations)
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

	// Add offer counts to locations
	const locationsWithOffers = locations.map((loc) => ({
		...loc,
		offerCount: (offerCountMap.get(loc.id) || 0) + allLocationsOfferCount
	}));

	return {
		locations: locationsWithOffers,
		allLocationsOfferCount
	};
};
