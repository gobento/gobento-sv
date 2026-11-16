// /src/routes/(dock)/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db.js';
import {
	reservations,
	businessOffers,
	businessLocations,
	pickupRequests,
	recurringGifts,
	charityProfiles,
	complaints
} from '#lib/server/schema.js';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { getAnalyticsData } from '#lib/server/analytics.js';
import { materializeDueGifts } from '#lib/server/recurringGifts.js';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'business') {
		throw error(403, 'This page is only accessible by business accounts');
	}

	const now = new Date();
	const analytics = await getAnalyticsData(account.id);

	// Bags to hand over in the next 24 hours — the one thing that needs doing today.
	const dayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	const pickupWhere = and(
		eq(businessOffers.businessAccountId, account.id),
		eq(reservations.status, 'active'),
		gte(reservations.pickupUntil, now),
		lte(reservations.pickupFrom, dayAhead)
	);

	const [pickupCount] = await db
		.select({ count: sql<number>`COUNT(*)::int` })
		.from(reservations)
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.where(pickupWhere);

	const upcomingPickups = await db
		.select({
			id: reservations.id,
			offerId: businessOffers.id,
			offerName: businessOffers.name,
			locationName: businessLocations.name,
			from: reservations.pickupFrom,
			until: reservations.pickupUntil
		})
		.from(reservations)
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.leftJoin(businessLocations, eq(businessOffers.locationId, businessLocations.id))
		.where(pickupWhere)
		.orderBy(reservations.pickupFrom)
		.limit(6);

	// Things the owner can fix from another page, surfaced here so nothing is missed.
	const [openComplaint] = await db
		.select({ count: sql<number>`COUNT(*)::int` })
		.from(complaints)
		.where(and(eq(complaints.businessAccountId, account.id), eq(complaints.status, 'open')));

	const offerStates = await db
		.select({ isActive: businessOffers.isActive, validUntil: businessOffers.validUntil })
		.from(businessOffers)
		.where(eq(businessOffers.businessAccountId, account.id));

	// Giving: upcoming charity pickups and how much has been given so far
	await materializeDueGifts({ businessAccountId: account.id });
	const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	const upcomingDonations = await db
		.select({
			id: pickupRequests.id,
			charityName: charityProfiles.name,
			locationName: businessLocations.name,
			from: pickupRequests.proposedPickupFrom,
			until: pickupRequests.proposedPickupUntil,
			recurring: sql<boolean>`${pickupRequests.recurringGiftId} is not null`
		})
		.from(pickupRequests)
		.innerJoin(charityProfiles, eq(pickupRequests.charityAccountId, charityProfiles.accountId))
		.leftJoin(businessLocations, eq(pickupRequests.locationId, businessLocations.id))
		.where(
			and(
				eq(pickupRequests.businessAccountId, account.id),
				eq(pickupRequests.status, 'accepted'),
				gte(pickupRequests.proposedPickupUntil, now),
				lte(pickupRequests.proposedPickupFrom, weekAhead)
			)
		)
		.orderBy(pickupRequests.proposedPickupFrom)
		.limit(6);

	const [giving] = await db
		.select({
			donations: sql<number>`COUNT(CASE WHEN ${pickupRequests.status} IN ('accepted', 'completed') AND ${pickupRequests.proposedPickupFrom} < now() THEN 1 END)::int`,
			charities: sql<number>`COUNT(DISTINCT CASE WHEN ${pickupRequests.status} IN ('accepted', 'completed') THEN ${pickupRequests.charityAccountId} END)::int`
		})
		.from(pickupRequests)
		.where(eq(pickupRequests.businessAccountId, account.id));

	const giftCounts = await db
		.select({ status: recurringGifts.status, count: sql<number>`COUNT(*)::int` })
		.from(recurringGifts)
		.where(
			and(
				eq(recurringGifts.businessAccountId, account.id),
				inArray(recurringGifts.status, ['proposed', 'active', 'paused'])
			)
		)
		.groupBy(recurringGifts.status);
	const giftCount = (status: string) => giftCounts.find((g) => g.status === status)?.count ?? 0;

	return {
		pickupsNextDay: pickupCount?.count ?? 0,
		upcomingPickups,
		attention: {
			openComplaints: openComplaint?.count ?? 0,
			inactiveOffers: offerStates.filter((offer) => !offer.isActive).length,
			expiredOffers: offerStates.filter(
				(offer) => offer.isActive && offer.validUntil && offer.validUntil < now
			).length
		},
		giving: {
			upcoming: upcomingDonations,
			donations: giving?.donations ?? 0,
			charities: giving?.charities ?? 0,
			activeGifts: giftCount('active'),
			proposedGifts: giftCount('proposed'),
			pausedGifts: giftCount('paused')
		},
		offerPerformanceData: analytics.offerPerformanceData,
		locationPerformanceData: analytics.locationPerformanceData,
		stats: analytics.stats
	};
};
