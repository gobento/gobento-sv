// src/routes/(dock)/admin/payments/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { assertAdmin } from '$lib/server/admin';
import { paymentAttempts, accounts, businessOffers } from '$lib/server/schema';
import { alias } from 'drizzle-orm/pg-core';
import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm';

const OUTCOMES = ['initiated', 'redirected', 'switched', 'failed', 'cancelled', 'completed'];
const METHODS = ['iban', 'tether'];

export const load: PageServerLoad = async ({ locals, url }) => {
	assertAdmin(locals.account);

	const q = url.searchParams.get('q')?.trim() ?? '';
	const outcome = url.searchParams.get('outcome')?.trim() ?? '';
	const method = url.searchParams.get('method')?.trim() ?? '';

	const userAcc = alias(accounts, 'user_acc');
	const bizAcc = alias(accounts, 'biz_acc');

	const conditions: SQL[] = [];
	if (OUTCOMES.includes(outcome)) {
		conditions.push(eq(paymentAttempts.outcome, outcome as (typeof OUTCOMES)[number]));
	}
	if (METHODS.includes(method)) {
		conditions.push(eq(paymentAttempts.paymentMethod, method as 'iban' | 'tether'));
	}
	if (q) {
		const emailMatch = or(ilike(userAcc.email, `%${q}%`), ilike(bizAcc.email, `%${q}%`));
		if (emailMatch) conditions.push(emailMatch);
	}

	const rows = await db
		.select({
			id: paymentAttempts.id,
			createdAt: paymentAttempts.createdAt,
			paymentMethod: paymentAttempts.paymentMethod,
			outcome: paymentAttempts.outcome,
			reason: paymentAttempts.reason,
			amount: paymentAttempts.amount,
			currency: paymentAttempts.currency,
			isMock: paymentAttempts.isMock,
			paymentId: paymentAttempts.paymentId,
			userId: paymentAttempts.userAccountId,
			userEmail: userAcc.email,
			businessId: paymentAttempts.businessAccountId,
			businessEmail: bizAcc.email,
			offerName: businessOffers.name
		})
		.from(paymentAttempts)
		.leftJoin(userAcc, eq(paymentAttempts.userAccountId, userAcc.id))
		.leftJoin(bizAcc, eq(paymentAttempts.businessAccountId, bizAcc.id))
		.leftJoin(businessOffers, eq(paymentAttempts.offerId, businessOffers.id))
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(paymentAttempts.createdAt))
		.limit(300);

	return {
		attempts: rows,
		filters: { q, outcome, method },
		outcomes: OUTCOMES,
		methods: METHODS,
		truncated: rows.length === 300
	};
};
