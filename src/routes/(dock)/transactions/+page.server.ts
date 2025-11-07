// src/routes/transactions/+page.server.ts
import { db } from '$lib/server/db';
import {
	monthlySettlements,
	settlementPayments,
	payments,
	businessWallets
} from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'business') {
		throw error(403, 'Only businesses can access transactions');
	}

	// Get business wallet configuration
	const wallet = await db.query.businessWallets.findFirst({
		where: eq(businessWallets.accountId, account.id)
	});

	// Get all settlements for this business, ordered by most recent first
	const settlements = await db
		.select()
		.from(monthlySettlements)
		.where(eq(monthlySettlements.businessAccountId, account.id))
		.orderBy(desc(monthlySettlements.year), desc(monthlySettlements.month));

	// Get detailed payment information for each settlement
	const settlementsWithPayments = await Promise.all(
		settlements.map(async (settlement) => {
			const paymentsInSettlement = await db
				.select({
					id: settlementPayments.id,
					paymentId: settlementPayments.paymentId,
					businessAmount: settlementPayments.businessAmount,
					currency: settlementPayments.currency,
					paymentMethod: settlementPayments.paymentMethod,
					addedAt: settlementPayments.addedAt,
					offerId: payments.offerId,
					completedAt: payments.completedAt,
					status: payments.status
				})
				.from(settlementPayments)
				.innerJoin(payments, eq(settlementPayments.paymentId, payments.id))
				.where(eq(settlementPayments.settlementId, settlement.id))
				.orderBy(desc(settlementPayments.addedAt));

			return {
				...settlement,
				payments: paymentsInSettlement
			};
		})
	);

	// Calculate summary statistics
	const totalPendingIban = settlements
		.filter((s) => ['pending', 'processing', 'partially_paid'].includes(s.status))
		.reduce((sum, s) => sum + s.ibanTotalAmount, 0);

	const totalPendingTether = settlements
		.filter((s) => ['pending', 'processing', 'partially_paid'].includes(s.status))
		.reduce((sum, s) => sum + s.tetherTotalAmount, 0);

	const totalPaidIban = settlements
		.filter((s) => s.ibanPaidAt !== null)
		.reduce((sum, s) => sum + s.ibanTotalAmount, 0);

	const totalPaidTether = settlements
		.filter((s) => s.tetherPaidAt !== null)
		.reduce((sum, s) => sum + s.tetherTotalAmount, 0);

	return {
		settlements: settlementsWithPayments,
		wallet,
		summary: {
			totalPendingIban,
			totalPendingTether,
			totalPaidIban,
			totalPaidTether,
			totalSettlements: settlements.length,
			pendingSettlements: settlements.filter((s) => s.status === 'pending').length
		}
	};
};
