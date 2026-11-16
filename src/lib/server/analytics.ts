// src/lib/server/analytics.ts
import { db } from '#lib/server/db.js';
import {
	reservations,
	businessOffers,
	businessLocations,
	favoriteLocations
} from '#lib/server/schema.js';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { parseAnalyticsDays, type AnalyticsDays } from '#lib/analytics.js';

export interface AnalyticsData {
	days: AnalyticsDays;
	reservationsData: { date: string; count: number; revenue: number }[];
	offerPerformanceData: {
		id: string;
		name: string;
		reservations: number;
		revenue: number;
	}[];
	peakHoursData: { hour: string; pickups: number }[];
	locationPerformanceData: {
		id: string;
		name: string;
		address: string;
		city: string;
		totalReservations: number;
		revenue: number;
		completionRate: number;
		favoritesCount: number;
	}[];
	stats: {
		totalReservations: number;
		totalRevenue: number;
		avgPerDay: number;
		activeOffers: number;
		completionRate: number;
		favoriteCount: number;
	};
}

/**
 * Aggregates analytics for a business account over a fixed window.
 * Shared by the analytics page, the dashboard and the Excel export so the same
 * numbers always mean the same thing.
 */
export async function getAnalyticsData(
	businessAccountId: string,
	requestedDays: AnalyticsDays = 30
): Promise<AnalyticsData> {
	const days = parseAnalyticsDays(String(requestedDays));
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

	// Reservations over time
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
				gte(reservations.reservedAt, since)
			)
		)
		.groupBy(sql`DATE(${reservations.reservedAt})`)
		.orderBy(sql`DATE(${reservations.reservedAt})`);

	// Offer performance. Only reservations inside the window count towards it.
	const offerPerformanceData = await db
		.select({
			id: businessOffers.id,
			name: businessOffers.name,
			reservations: sql<number>`COUNT(${reservations.id})::int`,
			revenue: sql<number>`COALESCE(SUM(${businessOffers.price}), 0)::float`
		})
		.from(businessOffers)
		.leftJoin(
			reservations,
			and(eq(reservations.offerId, businessOffers.id), gte(reservations.reservedAt, since))
		)
		.where(
			and(
				eq(businessOffers.businessAccountId, businessAccountId),
				eq(businessOffers.isActive, true)
			)
		)
		.groupBy(businessOffers.id)
		.orderBy(desc(sql`COUNT(${reservations.id})`))
		.limit(5);

	// Peak hours
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
				gte(reservations.reservedAt, since)
			)
		)
		.groupBy(sql`TO_CHAR(${reservations.pickupFrom}, 'HH24:00')`)
		.orderBy(sql`TO_CHAR(${reservations.pickupFrom}, 'HH24:00')`);

	// Location performance, with the same window applied to reservations
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
		.leftJoin(
			reservations,
			and(eq(reservations.offerId, businessOffers.id), gte(reservations.reservedAt, since))
		)
		.leftJoin(favoriteLocations, eq(favoriteLocations.locationId, businessLocations.id))
		.where(eq(businessLocations.businessAccountId, businessAccountId))
		.groupBy(businessLocations.id)
		.orderBy(desc(sql`COUNT(${reservations.id})`));

	const [totalReservations] = await db
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
				gte(reservations.reservedAt, since)
			)
		);

	const [activeOffers] = await db
		.select({ count: sql<number>`COUNT(*)::int` })
		.from(businessOffers)
		.where(
			and(
				eq(businessOffers.businessAccountId, businessAccountId),
				eq(businessOffers.isActive, true)
			)
		);

	const [favorites] = await db
		.select({ count: sql<number>`COUNT(DISTINCT ${favoriteLocations.accountId})::int` })
		.from(favoriteLocations)
		.innerJoin(businessLocations, eq(favoriteLocations.locationId, businessLocations.id))
		.where(eq(businessLocations.businessAccountId, businessAccountId));

	const count = totalReservations?.count ?? 0;

	return {
		days,
		reservationsData: reservationsData.map((row) => ({
			date: row.date,
			count: row.count,
			revenue: row.revenue || 0
		})),
		offerPerformanceData: offerPerformanceData.map((row) => ({
			id: row.id,
			name: row.name,
			reservations: row.reservations,
			revenue: row.revenue || 0
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
			favoritesCount: row.favoritesCount
		})),
		stats: {
			totalReservations: count,
			totalRevenue: totalReservations?.revenue ?? 0,
			avgPerDay: count / days,
			activeOffers: activeOffers?.count ?? 0,
			completionRate:
				count > 0 ? Math.round(((totalReservations?.completedCount ?? 0) / count) * 100) : 0,
			favoriteCount: favorites?.count ?? 0
		}
	};
}
