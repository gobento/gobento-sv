// src/routes/impact/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { reservations, businessOffers, accounts } from '$lib/server/schema';
import { eq, and, sql } from 'drizzle-orm';

// Environmental impact calculations (approximate values per meal)
const CO2_PER_MEAL = 1.25; // kg
const ENERGY_PER_MEAL = 3; // kWh
const WATER_PER_MEAL = 30; // liters

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'user') {
		throw redirect(403, 'This page is only available for users');
	}

	// Get all claimed reservations with offer details
	const claimedReservations = await db
		.select({
			id: reservations.id,
			claimedAt: reservations.claimedAt,
			offerName: businessOffers.name,
			originalValue: businessOffers.originalValue,
			price: businessOffers.price,
			currency: businessOffers.currency,
			locationId: businessOffers.locationId,
			businessAccountId: businessOffers.businessAccountId
		})
		.from(reservations)
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.where(and(eq(reservations.userAccountId, account.id), eq(reservations.status, 'claimed')))
		.orderBy(reservations.claimedAt);

	// Calculate statistics
	const totalReservations = claimedReservations.length;
	const moneySaved = claimedReservations.reduce(
		(sum, res) => sum + (res.originalValue - res.price),
		0
	);

	const co2Saved = totalReservations * CO2_PER_MEAL;
	const energySaved = totalReservations * ENERGY_PER_MEAL;
	const waterSaved = totalReservations * WATER_PER_MEAL;

	// Calculate months active
	const firstClaim = claimedReservations[0]?.claimedAt;
	const monthsActive = firstClaim
		? Math.max(
				1,
				Math.floor((Date.now() - new Date(firstClaim).getTime()) / (1000 * 60 * 60 * 24 * 30))
			)
		: 0;

	// Only query if we have business IDs
	const businessIds = [...new Set(claimedReservations.map((r) => r.businessAccountId))];

	let businessProfiles: Array<{ accountId: string; businessType: string }> = [];

	// Only query if we have business IDs
	if (businessIds.length > 0) {
		businessProfiles = await db
			.select({
				accountId: accounts.id,
				businessType: sql<string>`business_profiles.business_type`
			})
			.from(accounts)
			.innerJoin(sql`business_profiles`, sql`business_profiles.account_id = accounts.id`)
			.where(sql`accounts.id = ANY(${businessIds})`);
	}

	// Count by business type
	const typeCounts: Record<string, number> = {};
	claimedReservations.forEach((res) => {
		const profile = businessProfiles.find((p) => p.accountId === res.businessAccountId);
		if (profile?.businessType) {
			typeCounts[profile.businessType] = (typeCounts[profile.businessType] || 0) + 1;
		}
	});

	const favoriteCategory =
		Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

	// Calculate user rank (simplified - in production, optimize this query)
	const allUserStats = await db
		.select({
			userAccountId: reservations.userAccountId,
			count: sql<number>`count(*)::int`
		})
		.from(reservations)
		.where(eq(reservations.status, 'claimed'))
		.groupBy(reservations.userAccountId);

	const userRank = allUserStats.filter((stat) => stat.count > totalReservations).length + 1;
	const totalUsers = allUserStats.length;
	const rankPercentile = totalUsers > 0 ? Math.round((userRank / totalUsers) * 100) : 0;

	// Recent activity (last 5 claims)
	const recentActivity = claimedReservations.slice(-5).reverse();

	return {
		stats: {
			totalReservations,
			moneySaved: Math.round(moneySaved * 100) / 100,
			co2Saved: Math.round(co2Saved * 10) / 10,
			energySaved: Math.round(energySaved),
			waterSaved: Math.round(waterSaved),
			monthsActive,
			favoriteCategory: favoriteCategory.charAt(0).toUpperCase() + favoriteCategory.slice(1),
			currency: claimedReservations[0]?.currency || 'EUR',
			userRank,
			totalUsers,
			rankPercentile
		},
		recentActivity: recentActivity.map((r) => ({
			name: r.offerName,
			claimedAt: r.claimedAt?.toISOString(),
			saved: Math.round((r.originalValue - r.price) * 100) / 100
		}))
	};
};
