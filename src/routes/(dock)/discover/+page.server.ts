// src/routes/(dock)/discover/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	businessOffers,
	businessProfiles,
	businessLocations,
	files,
	accounts
} from '$lib/server/schema';
import { eq, and, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url }) => {
	const lat = url.searchParams.get('lat');
	const lon = url.searchParams.get('lon');
	const typesParam = url.searchParams.get('types');
	const selectedTypes = typesParam ? typesParam.split(',') : [];

	// Build where conditions
	const conditions = [eq(businessOffers.isActive, true)];
	if (selectedTypes.length > 0 && !selectedTypes.includes('all')) {
		conditions.push(inArray(businessProfiles.businessType, selectedTypes as any[]));
	}

	// Fetch all active offers with business and location details
	const offersData = await db
		.select({
			offer: businessOffers,
			business: businessProfiles,
			businessAccount: accounts,
			logo: files,
			location: businessLocations
		})
		.from(businessOffers)
		.innerJoin(accounts, eq(businessOffers.businessAccountId, accounts.id))
		.innerJoin(businessProfiles, eq(accounts.id, businessProfiles.accountId))
		.innerJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.leftJoin(businessLocations, eq(businessOffers.locationId, businessLocations.id))
		.where(and(...conditions));

	// Calculate distances and prepare offers
	let offers = offersData.map((row) => {
		let distance: number | null = null;

		if (lat && lon && row.location) {
			const userLat = parseFloat(lat);
			const userLon = parseFloat(lon);
			distance = calculateDistance(userLat, userLon, row.location.latitude, row.location.longitude);
		}

		return {
			id: row.offer.id,
			name: row.offer.name,
			description: row.offer.description,
			price: row.offer.price,
			currency: row.offer.currency,
			isRecurring: row.offer.isRecurring,
			validUntil: row.offer.validUntil,
			pickupTimeFrom: row.offer.pickupTimeFrom,
			pickupTimeUntil: row.offer.pickupTimeUntil,
			business: {
				name: row.business.name,
				type: row.business.businessType,
				logo: {
					id: row.logo.id,
					key: row.logo.key,
					fileName: row.logo.fileName
				}
			},
			location: row.location
				? {
						id: row.location.id,
						name: row.location.name,
						address: row.location.address,
						city: row.location.city,
						latitude: row.location.latitude,
						longitude: row.location.longitude
					}
				: null,
			distance
		};
	});

	// Sort by distance if coordinates provided
	if (lat && lon) {
		offers.sort((a, b) => {
			// Sort by distance (null distances go to end)
			if (a.distance === null) return 1;
			if (b.distance === null) return -1;
			return a.distance - b.distance;
		});
	}

	return { offers };
};

// Haversine formula to calculate distance in kilometers
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371; // Earth's radius in km
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRad(degrees: number): number {
	return degrees * (Math.PI / 180);
}
