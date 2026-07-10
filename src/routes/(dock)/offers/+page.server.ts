// src/routes/(dock)/offers/+page.server.ts
import { db } from '$lib/server/db';
import { businessOffers, businessLocations, files } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getSignedDownloadUrl } from '$lib/server/backblaze';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'business') {
		throw error(403, 'Only business accounts can access offers');
	}

	// Fetch all offers for this business with complete information
	const rows = await db
		.select({
			id: businessOffers.id,
			name: businessOffers.name,
			description: businessOffers.description,
			price: businessOffers.price,
			originalValue: businessOffers.originalValue,
			currency: businessOffers.currency,
			isActive: businessOffers.isActive,
			isRecurring: businessOffers.isRecurring,
			validUntil: businessOffers.validUntil,
			quantity: businessOffers.quantity,
			pickupTimeFrom: businessOffers.pickupTimeFrom,
			pickupTimeUntil: businessOffers.pickupTimeUntil,
			createdAt: businessOffers.createdAt,
			locationId: businessOffers.locationId,
			locationName: businessLocations.name,
			locationCity: businessLocations.city,
			locationProvince: businessLocations.province,
			imageKey: files.key
		})
		.from(businessOffers)
		.leftJoin(businessLocations, eq(businessOffers.locationId, businessLocations.id))
		.leftJoin(files, eq(businessOffers.imageId, files.id))
		.where(eq(businessOffers.businessAccountId, account.id))
		.orderBy(desc(businessOffers.createdAt));

	// Generate signed URLs for each offer's own image
	const offers = await Promise.all(
		rows.map(async ({ imageKey, ...offer }) => ({
			...offer,
			imageUrl: imageKey ? await getSignedDownloadUrl(imageKey) : null
		}))
	);

	return {
		offers
	};
};
