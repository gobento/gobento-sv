import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '#lib/server/db.js';
import { payments, businessOffers } from '#lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { PaymentHandler } from '#lib/server/payments/handler.js';
import {
	REQUIRED_CONFIRMATIONS,
	platformWalletAddress,
	usdtPaymentUri
} from '#lib/server/payments/tether.js';
import { superValidate, setError } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { txHashSchema } from './schema';

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	if (account.accountType !== 'user') {
		throw error(403, 'Only user accounts can make payments');
	}

	const [payment] = await db
		.select({
			payment: payments,
			offer: businessOffers
		})
		.from(payments)
		.leftJoin(businessOffers, eq(payments.offerId, businessOffers.id))
		.where(eq(payments.id, params.paymentId))
		.limit(1);

	if (!payment) {
		throw error(404, 'Payment not found');
	}

	if (payment.payment.userAccountId !== account.id) {
		throw error(403, 'Unauthorized');
	}

	if (payment.payment.status === 'completed' && payment.payment.reservationId) {
		throw redirect(303, `/reservations/${payment.payment.reservationId}`);
	}

	if (payment.payment.status === 'failed') {
		throw redirect(303, `/offers/${payment.payment.offerId}/payment?error=payment_failed`);
	}

	const amountUsdt = payment.payment.amountUsdt ?? 0;
	const form = await superValidate(valibot(txHashSchema));

	return {
		payment: {
			id: payment.payment.id,
			amountUsdt,
			// Payments get a 30-minute hold when they start; older rows may lack it.
			expiresAt:
				payment.payment.expiresAt ?? new Date(payment.payment.createdAt.getTime() + 30 * 60 * 1000),
			createdAt: payment.payment.createdAt
		},
		offer: {
			id: payment.payment.offerId,
			name: payment.offer?.name ?? 'Your order'
		},
		platformWalletAddress: platformWalletAddress(),
		paymentUri: usdtPaymentUri(amountUsdt),
		requiredConfirmations: REQUIRED_CONFIRMATIONS,
		form
	};
};

export const actions: Actions = {
	default: async ({ params, locals, request }) => {
		const account = locals.account!;
		const form = await superValidate(request, valibot(txHashSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const [payment] = await db
			.select()
			.from(payments)
			.where(eq(payments.id, params.paymentId))
			.limit(1);

		if (!payment) {
			return setError(form, '', 'Payment not found');
		}

		if (payment.userAccountId !== account.id) {
			return setError(form, '', 'This payment belongs to another account.');
		}

		if (payment.status === 'completed' && payment.reservationId) {
			return { form, reservationId: payment.reservationId };
		}

		if (payment.status === 'failed') {
			return setError(form, '', 'This payment has failed. Please start a new one from the offer.');
		}

		const result = await PaymentHandler.verifyTetherPayment({
			paymentId: payment.id,
			txHash: form.data.txHash
		});

		// Found on chain but not confirmed yet: the page keeps checking by itself.
		if (result.pending) {
			return { form, pending: true, confirmations: result.confirmations ?? 0 };
		}

		if (!result.success || !result.reservationId) {
			return setError(form, 'txHash', result.error || 'We could not verify this transfer.');
		}

		// Returned rather than redirected so the page can celebrate first; it then
		// moves on to the ticket.
		return { form, reservationId: result.reservationId };
	}
};
