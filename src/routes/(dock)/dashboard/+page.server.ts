// /src/routes/(dock)/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db.js';
import {
	reservations,
	businessOffers,
	businessLocations,
	favoriteLocations,
	pickupRequests,
	recurringGifts,
	charityProfiles
} from '#lib/server/schema.js';
import { eq, and, gte, sql, desc, inArray } from 'drizzle-orm';
import { materializeDueGifts } from '#lib/server/recurringGifts.js';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'business') {
		throw error(403, 'This page is only accessible by business accounts');
	}

	// Calculate date ranges
	const now = new Date();
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	// Fetch reservations data for the last 30 days
	const reservationsData = await db
		.select({
			date: sql<string>`DATE(${reservations.reservedAt})`,
			count: sql<number>`COUNT(*)::int`,
			revenue: sql<number>`SUM(${businessOffers.price})::float`
		})
		.from(reservations)
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.where(
			and(
				eq(businessOffers.businessAccountId, account.id),
				gte(reservations.reservedAt, thirtyDaysAgo)
			)
		)
		.groupBy(sql`DATE(${reservations.reservedAt})`)
		.orderBy(sql`DATE(${reservations.reservedAt})`);

	// Fetch offer performance data
	const offerPerformanceData = await db
		.select({
			id: businessOffers.id,
			name: businessOffers.name,
			reservations: sql<number>`COUNT(${reservations.id})::int`,
			revenue: sql<number>`SUM(${businessOffers.price})::float`,
			completedCount: sql<number>`COUNT(CASE WHEN ${reservations.status} = 'completed' THEN 1 END)::int`
		})
		.from(businessOffers)
		.leftJoin(reservations, eq(reservations.offerId, businessOffers.id))
		.where(and(eq(businessOffers.businessAccountId, account.id), eq(businessOffers.isActive, true)))
		.groupBy(businessOffers.id)
		.orderBy(desc(sql`COUNT(${reservations.id})`))
		.limit(5);

	// Fetch peak hours data
	const peakHoursData = await db
		.select({
			hour: sql<string>`TO_CHAR(${reservations.pickupFrom}, 'HH24:00')`,
			pickups: sql<number>`COUNT(*)::int`
		})
		.from(reservations)
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.where(
			and(
				eq(businessOffers.businessAccountId, account.id),
				gte(reservations.reservedAt, thirtyDaysAgo)
			)
		)
		.groupBy(sql`TO_CHAR(${reservations.pickupFrom}, 'HH24:00')`)
		.orderBy(sql`TO_CHAR(${reservations.pickupFrom}, 'HH24:00')`);

	// Fetch location performance data
	const locationPerformanceData = await db
		.select({
			id: businessLocations.id,
			name: businessLocations.name,
			address: businessLocations.address,
			city: businessLocations.city,
			totalReservations: sql<number>`COUNT(${reservations.id})::int`,
			revenue: sql<number>`COALESCE(SUM(${businessOffers.price}), 0)::float`,
			completedCount: sql<number>`COUNT(CASE WHEN ${reservations.status} = 'completed' THEN 1 END)::int`,
			totalCount: sql<number>`COUNT(${reservations.id})::int`,
			favoritesCount: sql<number>`COUNT(DISTINCT ${favoriteLocations.accountId})::int`
		})
		.from(businessLocations)
		.leftJoin(businessOffers, eq(businessOffers.locationId, businessLocations.id))
		.leftJoin(reservations, eq(reservations.offerId, businessOffers.id))
		.leftJoin(favoriteLocations, eq(favoriteLocations.locationId, businessLocations.id))
		.where(eq(businessLocations.businessAccountId, account.id))
		.groupBy(businessLocations.id)
		.orderBy(desc(sql`COUNT(${reservations.id})`));

	// Calculate overall stats
	const totalReservations = await db
		.select({
			count: sql<number>`COUNT(*)::int`,
			revenue: sql<number>`COALESCE(SUM(${businessOffers.price}), 0)::float`,
			completedCount: sql<number>`COUNT(CASE WHEN ${reservations.status} = 'completed' THEN 1 END)::int`
		})
		.from(reservations)
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.where(
			and(
				eq(businessOffers.businessAccountId, account.id),
				gte(reservations.reservedAt, thirtyDaysAgo)
			)
		)
		.then((rows) => rows[0]);

	const activeOffersCount = await db
		.select({ count: sql<number>`COUNT(*)::int` })
		.from(businessOffers)
		.where(and(eq(businessOffers.businessAccountId, account.id), eq(businessOffers.isActive, true)))
		.then((rows) => rows[0].count);

	const totalFavoritesCount = await db
		.select({ count: sql<number>`COUNT(DISTINCT ${favoriteLocations.accountId})::int` })
		.from(favoriteLocations)
		.innerJoin(businessLocations, eq(favoriteLocations.locationId, businessLocations.id))
		.where(eq(businessLocations.businessAccountId, account.id))
		.then((rows) => rows[0].count);

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
				sql`${pickupRequests.proposedPickupFrom} <= ${weekAhead}`
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

	// Bags still to hand over in the next 24 hours
	const dayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	const [nextDay] = await db
		.select({ count: sql<number>`COUNT(*)::int` })
		.from(reservations)
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.where(
			and(
				eq(businessOffers.businessAccountId, account.id),
				eq(reservations.status, 'active'),
				gte(reservations.pickupUntil, now),
				sql`${reservations.pickupFrom} <= ${dayAhead}`
			)
		);

	return {
		pickupsNextDay: nextDay?.count ?? 0,
		giving: {
			upcoming: upcomingDonations,
			donations: giving?.donations ?? 0,
			charities: giving?.charities ?? 0,
			activeGifts: giftCount('active'),
			proposedGifts: giftCount('proposed'),
			pausedGifts: giftCount('paused')
		},
		reservationsData: reservationsData.map((row) => ({
			date: row.date,
			count: row.count,
			revenue: row.revenue || 0
		})),
		offerPerformanceData: offerPerformanceData.map((row) => ({
			id: row.id,
			name: row.name,
			reservations: row.reservations,
			revenue: row.revenue || 0,
			avgRating: 4.5 // TODO: Add ratings table to schema
		})),
		peakHoursData,
		locationPerformanceData: locationPerformanceData.map((row) => ({
			id: row.id,
			name: row.name,
			address: row.address,
			city: row.city,
			totalReservations: row.totalReservations,
			revenue: row.revenue,
			completionRate:
				row.totalCount > 0 ? Math.round((row.completedCount / row.totalCount) * 100) : 0,
			favoritesCount: row.favoritesCount,
			avgRating: 4.5 // TODO: Add ratings table to schema
		})),
		stats: {
			totalReservations: totalReservations.count,
			totalRevenue: totalReservations.revenue,
			avgPerDay: Math.round(totalReservations.count / 30),
			activeOffers: activeOffersCount,
			completionRate:
				totalReservations.count > 0
					? Math.round((totalReservations.completedCount / totalReservations.count) * 100)
					: 0,
			favoriteCount: totalFavoritesCount
		}
	};
};
