// src/routes/(dock)/offers/+page.server.ts
import { db } from '$lib/server/db';
import { businessOffers, businessLocations, files, reservations } from '$lib/server/schema';
import { eq, and, asc, desc, gte, lte, inArray, sql, type SQL } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { getSignedDownloadUrl } from '$lib/server/backblaze';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const account = locals.account!;

	if (account.accountType !== 'business') {
		throw error(403, 'Only business accounts can access offers');
	}

	// Parse filter/sort query params
	const statusParam = url.searchParams.get('status'); // 'active' | 'inactive' | null
	const recurringParam = url.searchParams.get('recurring'); // 'recurring' | 'onetime' | null
	const sortParam = url.searchParams.get('sort'); // 'price_asc' | 'price_desc' | 'newest' | null
	const minAmountParam = url.searchParams.get('minAmount');
	const maxAmountParam = url.searchParams.get('maxAmount');

	const minAmount = minAmountParam ? parseInt(minAmountParam, 10) : null;
	const maxAmount = maxAmountParam ? parseInt(maxAmountParam, 10) : null;

	// Build filter conditions
	const conditions: SQL[] = [eq(businessOffers.businessAccountId, account.id)];

	if (statusParam === 'active') {
		conditions.push(eq(businessOffers.isActive, true));
	} else if (statusParam === 'inactive') {
		conditions.push(eq(businessOffers.isActive, false));
	}

	if (recurringParam === 'recurring') {
		conditions.push(eq(businessOffers.isRecurring, true));
	} else if (recurringParam === 'onetime') {
		conditions.push(eq(businessOffers.isRecurring, false));
	}

	if (minAmount !== null && !isNaN(minAmount)) {
		conditions.push(gte(businessOffers.quantity, minAmount));
	}

	if (maxAmount !== null && !isNaN(maxAmount)) {
		conditions.push(lte(businessOffers.quantity, maxAmount));
	}

	// Determine sort order
	const orderBy =
		sortParam === 'price_asc'
			? asc(businessOffers.price)
			: sortParam === 'price_desc'
				? desc(businessOffers.price)
				: desc(businessOffers.createdAt);

	// Fetch offers for this business with complete information
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
			.where(and(...conditions))
			.orderBy(orderBy);

	// Count active reservations per offer so we can warn before deletion
	const offerIds = rows.map((r) => r.id);
	const reservationCounts =
		offerIds.length > 0
			? await db
				.select({
					offerId: reservations.offerId,
					count: sql<number>`cast(count(*) as integer)`
				})
				.from(reservations)
				.where(and(inArray(reservations.offerId, offerIds), eq(reservations.status, 'active')))
				.groupBy(reservations.offerId)
			: [];
	const reservationCountMap = new Map(reservationCounts.map((r) => [r.offerId, r.count]));

	// Generate signed URLs for each offer's own image
	const offers = await Promise.all(
		rows.map(async ({ imageKey, ...offer }) => ({
			...offer,
			reservedCount: reservationCountMap.get(offer.id) ?? 0,
			imageUrl: imageKey ? await getSignedDownloadUrl(imageKey) : null
		}))
	);

	// Unfiltered stats for the summary bar
	const allOffers = await db
		.select({ isActive: businessOffers.isActive, locationId: businessOffers.locationId })
		.from(businessOffers)
		.where(eq(businessOffers.businessAccountId, account.id));

	const stats = {
		total: allOffers.length,
		active: allOffers.filter((o) => o.isActive).length,
		allLocations: allOffers.filter((o) => o.locationId === null).length
	};

	return {
		offers,
		stats,
		filters: {
			status: statusParam ?? 'all',
			recurring: recurringParam ?? 'all',
			sort: sortParam ?? 'newest',
			minAmount: minAmount !== null && !isNaN(minAmount) ? minAmount : null,
			maxAmount: maxAmount !== null && !isNaN(maxAmount) ? maxAmount : null
		}
	};
};

export const actions: Actions = {
	deleteOffer: async ({ request, locals }) => {
		const account = locals.account;

		if (!account || account.accountType !== 'business') {
			return fail(403, { message: 'Only business accounts can delete offers' });
		}

		const formData = await request.formData();
		const offerId = formData.get('offerId') as string;

		if (!offerId) {
			return fail(400, { message: 'Offer ID is required' });
		}

		// Verify the offer exists and belongs to this business
		const [offer] = await db
			.select({ id: businessOffers.id })
			.from(businessOffers)
			.where(and(eq(businessOffers.id, offerId), eq(businessOffers.businessAccountId, account.id)))
			.limit(1);

		if (!offer) {
			return fail(404, { message: 'Offer not found' });
		}

		try {
			// Reservations reference the offer with onDelete cascade, so they are
			// removed automatically together with the offer.
			await db.delete(businessOffers).where(eq(businessOffers.id, offerId));
			return { success: true };
		} catch (e) {
			console.error('Failed to delete offer:', e);
			return fail(500, { message: 'Failed to delete offer' });
		}
	}
} satisfies Actions;
