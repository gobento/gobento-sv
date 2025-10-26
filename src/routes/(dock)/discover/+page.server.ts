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
import { getSignedDownloadUrl } from '$lib/server/backblaze'; // ← Import this
import { calculateDistance } from '$lib/util';

export const load: PageServerLoad = async ({ url }) => {
	const lat = url.searchParams.get('lat');
	const lon = url.searchParams.get('lon');
	const typesParam = url.searchParams.get('types');
	const selectedTypes = typesParam ? typesParam.split(',') : [];

	const conditions = [eq(businessOffers.isActive, true)];
	if (selectedTypes.length > 0 && !selectedTypes.includes('all')) {
		conditions.push(inArray(businessProfiles.businessType, selectedTypes as any[]));
	}

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

	// Generate signed URLs for all logos
	const offers = await Promise.all(
		offersData.map(async (row) => {
			let distance: number | null = null;

			if (lat && lon && row.location) {
				const userLat = parseFloat(lat);
				const userLon = parseFloat(lon);
				distance = calculateDistance(
					userLat,
					userLon,
					row.location.latitude,
					row.location.longitude
				);
			}

			// Generate signed URL for the logo
			const logoUrl = await getSignedDownloadUrl(row.logo.key, 3600); // 1 hour expiry

			return {
				id: row.offer.id,
				name: row.offer.name,
				description: row.offer.description,
				price: row.offer.price,
				originalValue: row.offer.originalValue,
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
						url: logoUrl, // ← Now this is a signed URL!
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
		})
	);

	// Sort by distance if coordinates provided
	if (lat && lon) {
		offers.sort((a, b) => {
			if (a.distance === null) return 1;
			if (b.distance === null) return -1;
			return a.distance - b.distance;
		});
	}

	return { offers };
};
