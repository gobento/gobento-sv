// src/routes/(dock)/admin/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { assertAdmin } from '$lib/server/admin';
import {
	accounts,
	payments,
	paymentAttempts,
	reservations,
	sessions,
	monthlySettlements
} from '$lib/server/schema';
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
