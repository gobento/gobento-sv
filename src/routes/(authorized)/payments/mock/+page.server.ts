import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db.js';
import { businessOffers, businessProfiles, payments } from '#lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { isMockEnabled } from '#lib/server/mock/index.js';

export const load: PageServerLoad = async ({ url, locals }) => {
	// This sandbox gateway only exists in mock mode.
	if (!isMockEnabled()) {
		throw error(404, 'Not found');
	}

	const authority = url.searchParams.get('authority');
	const paymentId = url.searchParams.get('paymentId');

	if (!authority || !paymentId) {
		throw error(400, 'Missing payment reference');
	}

	const [payment] = await db
		.select({
			id: payments.id,
			userAccountId: payments.userAccountId,
			amount: payments.amount,
			currency: payments.currency,
			status: payments.status,
			offerId: payments.offerId,
			offerName: businessOffers.name,
			businessName: businessProfiles.name
		})
		.from(payments)
		.innerJoin(businessOffers, eq(businessOffers.id, payments.offerId))
		.innerJoin(businessProfiles, eq(businessProfiles.accountId, payments.businessAccountId))
		.where(eq(payments.id, paymentId))
		.limit(1);

	if (!payment) {
		throw error(404, 'Payment not found');
	}

	if (payment.userAccountId !== locals.account?.id) {
		throw error(403, 'This payment belongs to another account');
	}

	return {
		authority,
		payment: {
			id: payment.id,
			amount: payment.amount,
			currency: payment.currency,
			status: payment.status,
			offerId: payment.offerId,
			offerName: payment.offerName,
			businessName: payment.businessName
		}
	};
};
