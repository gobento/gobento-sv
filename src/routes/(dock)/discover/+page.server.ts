// src/routes/(dock)/discover/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db.js';
import {
	businessOffers,
	businessProfiles,
	businessLocations,
	favoriteLocations,
	reservations,
	files
} from '#lib/server/schema.js';
import { eq, and, or, isNull, gt, desc, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getSignedDownloadUrl } from '#lib/server/backblaze.js';
import { calculateDistance } from '#lib/util.js';
import { priceWithMargin } from '#lib/server/payments/currency.js';

/** Upper bound on what one visit ships to the client. */
const MAX_OFFERS = 120;

function parseCoordinate(value: string | null, limit: number): number | null {
	if (!value) return null;
	const number = Number(value);
	return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const account = locals.account!;
	const lat = parseCoordinate(url.searchParams.get('lat'), 90);
	const lon = parseCoordinate(url.searchParams.get('lon'), 180);
	const origin = lat !== null && lon !== null ? { lat, lon } : null;

	const logoFiles = alias(files, 'logoFiles');
	const offerFiles = alias(files, 'offerFiles');
	const locationFiles = alias(files, 'locationFiles');

	// Category and text filters run in the browser so they feel instant; the
	// server only decides which offers are live and how far away they are.
	const [rows, reservedRows, favoriteRows] = await Promise.all([
		db
			.select({
				id: businessOffers.id,
				name: businessOffers.name,
				price: businessOffers.price,
				originalValue: businessOffers.originalValue,
				quantity: businessOffers.quantity,
				isRecurring: businessOffers.isRecurring,
				pickupTimeFrom: businessOffers.pickupTimeFrom,
				pickupTimeUntil: businessOffers.pickupTimeUntil,
				businessName: businessProfiles.name,
				businessType: businessProfiles.businessType,
				country: businessProfiles.country,
				logoKey: logoFiles.key,
				offerImageKey: offerFiles.key,
				locationId: businessLocations.id,
				locationName: businessLocations.name,
				locationCity: businessLocations.city,
				latitude: businessLocations.latitude,
				longitude: businessLocations.longitude,
				locationImageKey: locationFiles.key
			})
			.from(businessOffers)
			.innerJoin(businessProfiles, eq(businessOffers.businessAccountId, businessProfiles.accountId))
			.innerJoin(logoFiles, eq(businessProfiles.profilePictureId, logoFiles.id))
			.leftJoin(businessLocations, eq(businessOffers.locationId, businessLocations.id))
			.leftJoin(offerFiles, eq(businessOffers.imageId, offerFiles.id))
			.leftJoin(locationFiles, eq(businessLocations.imageId, locationFiles.id))
			.where(
				and(
					eq(businessOffers.isActive, true),
					or(isNull(businessOffers.validUntil), gt(businessOffers.validUntil, new Date()))
				)
			)
			.orderBy(desc(businessOffers.createdAt)),
		db
			.select({
				offerId: reservations.offerId,
				count: sql<number>`cast(count(*) as integer)`
			})
			.from(reservations)
			.where(eq(reservations.status, 'active'))
			.groupBy(reservations.offerId),
		account.accountType === 'user'
			? db
					.select({ locationId: favoriteLocations.locationId })
					.from(favoriteLocations)
					.where(eq(favoriteLocations.accountId, account.id))
			: Promise.resolve([])
	]);

	const reserved = new Map(reservedRows.map((row) => [row.offerId, row.count]));

	const ranked = rows.map((row) => ({
		row,
		distance:
			origin && row.latitude !== null && row.longitude !== null
				? calculateDistance(origin.lat, origin.lon, row.latitude, row.longitude)
				: null
	}));

	if (origin) {
		ranked.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
	}

	const visible = ranked.slice(0, MAX_OFFERS);

	// Many offers share a logo or a location photo: sign each file once, and
	// only for the offers that are actually sent.
	const keys = new Set<string>();
	for (const { row } of visible) {
		keys.add(row.logoKey);
		if (row.offerImageKey) keys.add(row.offerImageKey);
		if (row.locationImageKey) keys.add(row.locationImageKey);
	}
	const signed = new Map(
		await Promise.all([...keys].map(async (key) => [key, await getSignedDownloadUrl(key)] as const))
	);
	const urlFor = (key: string | null) => (key ? (signed.get(key) ?? null) : null);

	const offers = visible.map(({ row, distance }) => {
		const locationImageUrl = urlFor(row.locationImageKey);
		return {
			id: row.id,
			name: row.name,
			price: priceWithMargin(row.price),
			originalValue: row.originalValue,
			isRecurring: row.isRecurring,
			pickupTimeFrom: row.pickupTimeFrom,
			pickupTimeUntil: row.pickupTimeUntil,
			available: Math.max(0, row.quantity - (reserved.get(row.id) ?? 0)),
			imageUrl: urlFor(row.offerImageKey) ?? locationImageUrl,
			distance,
			business: {
				name: row.businessName,
				type: row.businessType,
				country: row.country,
				logoUrl: urlFor(row.logoKey)
			},
			location: row.locationId
				? {
						id: row.locationId,
						name: row.locationName ?? row.businessName,
						city: row.locationCity ?? '',
						imageUrl: locationImageUrl
					}
				: null
		};
	});

	return {
		offers,
		hasOrigin: origin !== null,
		canFavorite: account.accountType === 'user',
		favoriteLocationIds: favoriteRows.map((row) => row.locationId)
	};
};
