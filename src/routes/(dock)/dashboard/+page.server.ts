<!-- +page.server.ts -->
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { 
	reservations, 
	businessOffers, 
	businessLocations, 
	favoriteLocations,
	accounts 
} from '$lib/server/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is a business account
	const session = locals.session;
	if (!session) {
		throw redirect(302, '/login');
	}

	const account = await db.query.accounts.findFirst({
		where: eq(accounts.id, session.accountId)
	});

	if (!account || account.accountType !== 'business') {
		throw error(403, 'Access denied');
	}

	const businessAccountId = account.id;

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
				eq(businessOffers.businessAccountId, businessAccountId),
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
		.where(
			and(
				eq(businessOffers.businessAccountId, businessAccountId),
				eq(businessOffers.isActive, true)
			)
		)
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
				eq(businessOffers.businessAccountId, businessAccountId),
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
		.leftJoin(
			businessOffers,
			eq(businessOffers.locationId, businessLocations.id)
		)
		.leftJoin(reservations, eq(reservations.offerId, businessOffers.id))
		.leftJoin(
			favoriteLocations,
			eq(favoriteLocations.locationId, businessLocations.id)
		)
		.where(eq(businessLocations.businessAccountId, businessAccountId))
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
				eq(businessOffers.businessAccountId, businessAccountId),
				gte(reservations.reservedAt, thirtyDaysAgo)
			)
		)
		.then(rows => rows[0]);

	const activeOffersCount = await db
		.select({ count: sql<number>`COUNT(*)::int` })
		.from(businessOffers)
		.where(
			and(
				eq(businessOffers.businessAccountId, businessAccountId),
				eq(businessOffers.isActive, true)
			)
		)
		.then(rows => rows[0].count);

	const totalFavoritesCount = await db
		.select({ count: sql<number>`COUNT(DISTINCT ${favoriteLocations.accountId})::int` })
		.from(favoriteLocations)
		.innerJoin(
			businessLocations,
			eq(favoriteLocations.locationId, businessLocations.id)
		)
		.where(eq(businessLocations.businessAccountId, businessAccountId))
		.then(rows => rows[0].count);

	return {
		reservationsData: reservationsData.map(row => ({
			date: row.date,
			count: row.count,
			revenue: row.revenue || 0
		})),
		offerPerformanceData: offerPerformanceData.map(row => ({
			id: row.id,
			name: row.name,
			reservations: row.reservations,
			revenue: row.revenue || 0,
			avgRating: 4.5 // TODO: Add ratings table to schema
		})),
		peakHoursData,
		locationPerformanceData: locationPerformanceData.map(row => ({
			id: row.id,
			name: row.name,
			address: row.address,
			city: row.city,
			totalReservations: row.totalReservations,
			revenue: row.revenue,
			completionRate: row.totalCount > 0 
				? Math.round((row.completedCount / row.totalCount) * 100) 
				: 0,
			favoritesCount: row.favoritesCount,
			avgRating: 4.5 // TODO: Add ratings table to schema
		})),
		stats: {
			totalReservations: totalReservations.count,
			totalRevenue: totalReservations.revenue,
			avgPerDay: Math.round(totalReservations.count / 30),
			activeOffers: activeOffersCount,
			completionRate: totalReservations.count > 0
				? Math.round((totalReservations.completedCount / totalReservations.count) * 100)
				: 0,
			favoriteCount: totalFavoritesCount
		}
	};
};