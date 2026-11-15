// src/routes/(dock)/admin/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db.js';
import { assertAdmin } from '#lib/server/admin.js';
import {
	accounts,
	payments,
	paymentAttempts,
	reservations,
	sessions,
	monthlySettlements
} from '#lib/server/schema.js';
import { and, eq, gt, gte, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.account);

	const now = new Date();
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	// --- Active users (three complementary definitions) ---
	const activeSessionUsers = await db
		.select({ count: sql<number>`COUNT(DISTINCT ${sessions.accountId})::int` })
		.from(sessions)
		.where(gt(sessions.expiresAt, now))
		.then((rows) => rows[0]?.count ?? 0);

	const activeReservationUsers = await db
		.select({ count: sql<number>`COUNT(DISTINCT ${reservations.userAccountId})::int` })
		.from(reservations)
		.where(eq(reservations.status, 'active'))
		.then((rows) => rows[0]?.count ?? 0);

	// Distinct users who reserved or paid in the last 30 days.
	const recentRows = (await db.execute(sql`
		SELECT COUNT(*)::int AS count FROM (
			SELECT user_account_id FROM reservations WHERE reserved_at >= ${thirtyDaysAgo}
			UNION
			SELECT user_account_id FROM payments WHERE created_at >= ${thirtyDaysAgo}
		) AS active_users
	`)) as unknown as Array<{ count: number }>;
	const recentlyActiveUsers = Number(recentRows[0]?.count ?? 0);

	// --- Platform activity: growth, food rescued, supply ---
	const [platform] = (await db.execute(sql`
		SELECT
			(SELECT COUNT(*) FROM accounts WHERE created_at >= ${thirtyDaysAgo})::int AS signups_30d,
			(SELECT COUNT(*) FROM reservations WHERE reserved_at >= ${thirtyDaysAgo})::int AS reservations_30d,
			(SELECT COUNT(*) FROM reservations WHERE status IN ('completed', 'claimed'))::int AS rescued_total,
			(SELECT COUNT(*) FROM reservations
				WHERE status IN ('completed', 'claimed') AND reserved_at >= ${thirtyDaysAgo})::int AS rescued_30d,
			(SELECT COUNT(*) FROM business_offers
				WHERE is_active AND (valid_until IS NULL OR valid_until > now()))::int AS live_offers,
			(SELECT COUNT(*) FROM business_profiles WHERE verification_status = 'verified')::int AS verified_businesses,
			(SELECT COUNT(*) FROM business_profiles WHERE verification_status = 'pending')::int AS pending_businesses,
			(SELECT COUNT(*) FROM charity_profiles WHERE verification_status = 'verified')::int AS verified_charities,
			(SELECT COUNT(*) FROM charity_profiles WHERE verification_status = 'pending')::int AS pending_charities
	`)) as unknown as Array<Record<string, number>>;

	// Daily sign-ups and reservations over the last 30 days.
	const dailyRows = (await db.execute(sql`
		SELECT day::date::text AS day,
			(SELECT COUNT(*) FROM accounts WHERE created_at >= day AND created_at < day + interval '1 day')::int AS signups,
			(SELECT COUNT(*) FROM reservations WHERE reserved_at >= day AND reserved_at < day + interval '1 day')::int AS reservations
		FROM generate_series(date_trunc('day', ${thirtyDaysAgo}::timestamptz), date_trunc('day', now()), interval '1 day') AS day
		ORDER BY day
	`)) as unknown as Array<{ day: string; signups: number; reservations: number }>;

	// --- Account counts by type ---
	const accountRows = await db
		.select({ type: accounts.accountType, count: sql<number>`COUNT(*)::int` })
		.from(accounts)
		.groupBy(accounts.accountType);
	const accountsByType = accountRows.map((row) => ({ type: row.type, count: row.count }));
	const totalAccounts = accountsByType.reduce((sum, row) => sum + row.count, 0);

	// --- Transaction volume (USDT-normalised) ---
	const completedAll = await db
		.select({
			count: sql<number>`COUNT(*)::int`,
			usdt: sql<number>`COALESCE(SUM(${payments.amountUsdt}), 0)::float`
		})
		.from(payments)
		.where(eq(payments.status, 'completed'))
		.then((rows) => rows[0]);

	const completed30d = await db
		.select({
			count: sql<number>`COUNT(*)::int`,
			usdt: sql<number>`COALESCE(SUM(${payments.amountUsdt}), 0)::float`
		})
		.from(payments)
		.where(and(eq(payments.status, 'completed'), gte(payments.createdAt, thirtyDaysAgo)))
		.then((rows) => rows[0]);

	// --- Payment breakdowns ---
	const paymentsByStatus = await db
		.select({ status: payments.status, count: sql<number>`COUNT(*)::int` })
		.from(payments)
		.groupBy(payments.status);

	const paymentsByMethod = await db
		.select({
			method: payments.paymentMethod,
			count: sql<number>`COUNT(*)::int`,
			usdt: sql<number>`COALESCE(SUM(${payments.amountUsdt}), 0)::float`
		})
		.from(payments)
		.groupBy(payments.paymentMethod);

	// Completed payments grouped by original currency (raw amounts, per-currency).
	const currencyBreakdown = await db
		.select({
			currency: payments.currency,
			count: sql<number>`COUNT(*)::int`,
			gross: sql<number>`COALESCE(SUM(${payments.amount}), 0)::float`,
			fees: sql<number>`COALESCE(SUM(${payments.feeAmount}), 0)::float`,
			business: sql<number>`COALESCE(SUM(${payments.businessAmount}), 0)::float`
		})
		.from(payments)
		.where(eq(payments.status, 'completed'))
		.groupBy(payments.currency);

	// --- Payment attempts (the full log) grouped by outcome ---
	const attemptsByOutcome = await db
		.select({ outcome: paymentAttempts.outcome, count: sql<number>`COUNT(*)::int` })
		.from(paymentAttempts)
		.groupBy(paymentAttempts.outcome);
	const totalAttempts = attemptsByOutcome.reduce((sum, row) => sum + row.count, 0);

	// --- Outstanding business payouts ---
	const settlement = await db
		.select({
			pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${monthlySettlements.status} IN ('pending', 'processing', 'partially_paid'))::int`,
			pendingIban: sql<number>`COALESCE(SUM(${monthlySettlements.ibanTotalAmount}) FILTER (WHERE ${monthlySettlements.status} IN ('pending', 'processing', 'partially_paid')), 0)::float`,
			pendingTether: sql<number>`COALESCE(SUM(${monthlySettlements.tetherTotalAmount}) FILTER (WHERE ${monthlySettlements.status} IN ('pending', 'processing', 'partially_paid')), 0)::float`
		})
		.from(monthlySettlements)
		.then((rows) => rows[0]);

	return {
		activeUsers: {
			activeSessions: activeSessionUsers,
			activeReservations: activeReservationUsers,
			recent30d: recentlyActiveUsers
		},
		platform: {
			signups30d: Number(platform?.signups_30d ?? 0),
			reservations30d: Number(platform?.reservations_30d ?? 0),
			rescuedTotal: Number(platform?.rescued_total ?? 0),
			rescued30d: Number(platform?.rescued_30d ?? 0),
			liveOffers: Number(platform?.live_offers ?? 0),
			verifiedBusinesses: Number(platform?.verified_businesses ?? 0),
			pendingBusinesses: Number(platform?.pending_businesses ?? 0),
			verifiedCharities: Number(platform?.verified_charities ?? 0),
			pendingCharities: Number(platform?.pending_charities ?? 0),
			daily: dailyRows.map((row) => ({
				day: row.day,
				signups: Number(row.signups),
				reservations: Number(row.reservations)
			}))
		},
		accounts: {
			total: totalAccounts,
			byType: accountsByType
		},
		transactions: {
			completedCount: completedAll?.count ?? 0,
			completedVolumeUsdt: completedAll?.usdt ?? 0,
			completedCount30d: completed30d?.count ?? 0,
			completedVolumeUsdt30d: completed30d?.usdt ?? 0,
			byStatus: paymentsByStatus,
			byMethod: paymentsByMethod,
			currencyBreakdown
		},
		attempts: {
			total: totalAttempts,
			byOutcome: attemptsByOutcome
		},
		payouts: {
			pendingCount: settlement?.pendingCount ?? 0,
			pendingIban: settlement?.pendingIban ?? 0,
			pendingTether: settlement?.pendingTether ?? 0
		}
	};
};
