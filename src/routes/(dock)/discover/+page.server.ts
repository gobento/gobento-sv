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
import { eq, and } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getSignedDownloadUrl } from '$lib/server/backblaze';
import { calculateDistance } from '$lib/util';
import { priceWithMargin } from '$lib/server/payments/currency';

export const load: PageServerLoad = async ({ url }) => {
	const lat = url.searchParams.get('lat');
	const lon = url.searchParams.get('lon');
	const typesParam = url.searchParams.get('types');
	const selectedTypes = typesParam ? typesParam.split(',') : [];

	// NOTE: The business-type filter is intentionally NOT applied at the query
	// level. Special deals must reflect the whole (nearby) catalogue regardless
	// of the selected categories, so we fetch every active offer here and apply
	// the type filter in memory to the general offers & locations lists only.
	const conditions = [eq(businessOffers.isActive, true)];

	const offerFiles = alias(files, 'offerFiles');
	const locationFiles = alias(files, 'locationFiles');

	const offersData = await db
		.select({
			offer: businessOffers,
			business: businessProfiles,
			businessAccount: accounts,
			logo: files,
			location: businessLocations,
			offerImageKey: offerFiles.key,
			locationImageKey: locationFiles.key
		})
		.from(businessOffers)
		.innerJoin(accounts, eq(businessOffers.businessAccountId, accounts.id))
		.innerJoin(businessProfiles, eq(accounts.id, businessProfiles.accountId))
		.innerJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.leftJoin(businessLocations, eq(businessOffers.locationId, businessLocations.id))
		.leftJoin(offerFiles, eq(businessOffers.imageId, offerFiles.id))
		.leftJoin(locationFiles, eq(businessLocations.imageId, locationFiles.id))
		.where(and(...conditions));

	// Generate signed URLs for all logos
	const allOffers = await Promise.all(
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
			const logoUrl = await getSignedDownloadUrl(row.logo.key);

			// Generate signed URLs for the offer/location imagery (used as the card photo)
			const [offerImageUrl, locationImageUrl] = await Promise.all([
				row.offerImageKey ? getSignedDownloadUrl(row.offerImageKey) : Promise.resolve(null),
				row.locationImageKey ? getSignedDownloadUrl(row.locationImageKey) : Promise.resolve(null)
			]);

			const discountPercent =
				row.offer.originalValue > 0
					? Math.round(
							((row.offer.originalValue - priceWithMargin(row.offer.price)) /
								row.offer.originalValue) *
								100
						)
					: 0;

			return {
				id: row.offer.id,
				name: row.offer.name,
				description: row.offer.description,
				price: priceWithMargin(row.offer.price),
				originalValue: row.offer.originalValue,
				discountPercent,
				currency: row.offer.currency,
				isRecurring: row.offer.isRecurring,
				validUntil: row.offer.validUntil,
				pickupTimeFrom: row.offer.pickupTimeFrom,
				pickupTimeUntil: row.offer.pickupTimeUntil,
				imageUrl: offerImageUrl ?? locationImageUrl,
				business: {
					name: row.business.name,
					type: row.business.businessType,
					country: row.business.country,
					logo: {
						id: row.logo.id,
						url: logoUrl,
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
							longitude: row.location.longitude,
							imageUrl: locationImageUrl
						}
					: null,
				distance
			};
		})
	);

	// Sort by distance if coordinates provided
	if (lat && lon) {
		allOffers.sort((a, b) => {
			if (a.distance === null) return 1;
			if (b.distance === null) return -1;
			return a.distance - b.distance;
		});
	}

	// Apply the business-type filter to the general offers & locations only.
	const filterByType = selectedTypes.length > 0 && !selectedTypes.includes('all');
	const offers = filterByType
		? allOffers.filter((o) => selectedTypes.includes(o.business.type))
		: allOffers;

	// Group offers into browsable locations (with a photo + offer count)
	const locationMap = new Map<string, (typeof locations)[number]>();
	const locations: {
		id: string;
		name: string;
		city: string;
		address: string;
		distance: number | null;
		imageUrl: string | null;
		businessName: string;
		businessType: string;
		logoUrl: string;
		offerCount: number;
		bestDiscount: number;
	}[] = [];

	for (const offer of offers) {
		if (!offer.location) continue;
		const existing = locationMap.get(offer.location.id);
		if (existing) {
			existing.offerCount += 1;
			existing.bestDiscount = Math.max(existing.bestDiscount, offer.discountPercent);
		} else {
			const entry = {
				id: offer.location.id,
				name: offer.location.name,
				city: offer.location.city,
				address: offer.location.address,
				distance: offer.distance,
				imageUrl: offer.location.imageUrl,
				businessName: offer.business.name,
				businessType: offer.business.type,
				logoUrl: offer.business.logo.url,
				offerCount: 1,
				bestDiscount: offer.discountPercent
			};
			locationMap.set(offer.location.id, entry);
			locations.push(entry);
		}
	}

	if (lat && lon) {
		locations.sort((a, b) => {
			if (a.distance === null) return 1;
			if (b.distance === null) return -1;
			return a.distance - b.distance;
		});
	}

	// Compute "special deals" highlights from the nearby offers.
	// These are derived from the full catalogue (`allOffers`) so the active
	// category filter never hides them.
	// When a location is set, offers are already ordered by distance, so we only
	// look at the closest ones to keep the deals genuinely "nearby".
	const dealPool = (lat && lon ? allOffers.filter((o) => o.distance !== null) : allOffers).slice(
		0,
		30
	);

	let bestDiscountOffer: (typeof allOffers)[number] | null = null;
	let cheapestOffer: (typeof allOffers)[number] | null = null;

	for (const offer of dealPool) {
		if (!bestDiscountOffer || offer.discountPercent > bestDiscountOffer.discountPercent) {
			bestDiscountOffer = offer;
		}
		if (!cheapestOffer || offer.price < cheapestOffer.price) {
			cheapestOffer = offer;
		}
	}

	const specialDeals: {
		label: string;
		type: 'discount' | 'cheapest';
		offer: (typeof allOffers)[number];
	}[] = [];
	if (bestDiscountOffer && bestDiscountOffer.discountPercent > 0) {
		specialDeals.push({ label: 'Biggest discount', type: 'discount', offer: bestDiscountOffer });
	}
	// Avoid showing the same offer twice
	if (cheapestOffer && cheapestOffer.id !== bestDiscountOffer?.id) {
		specialDeals.push({ label: 'Cheapest nearby', type: 'cheapest', offer: cheapestOffer });
	}

	return {
		offers,
		locations,
		specialDeals
	};
};
