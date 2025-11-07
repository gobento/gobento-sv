// src/routes/(dock)/offers/[id]/payment/tether/[paymentId]/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { payments, businessOffers } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { PaymentHandler } from '$lib/server/payments/handler';
import { superValidate, setError } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { TETHER_CONTRACT_ADDRESS } from '$env/static/private';
import { txHashSchema } from './schema';

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	if (account.accountType !== 'user') {
		throw error(403, 'Only user accounts can make payments');
	}

	// Get payment with offer details in one query
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

	// Verify ownership
	if (payment.payment.userAccountId !== account.id) {
		throw error(403, 'Unauthorized');
	}

	// Check if already completed - redirect to reservation
	if (payment.payment.status === 'completed' && payment.payment.reservationId) {
		throw redirect(303, `/reservations/${payment.payment.reservationId}`);
	}

	// Check if failed
	if (payment.payment.status === 'failed') {
		throw error(400, 'Payment has failed. Please create a new payment.');
	}

	const form = await superValidate(valibot(txHashSchema));

	console.log('payment', payment);

	return {
		payment: {
			id: payment.payment.id,
			amountUsdt: payment.payment.amountUsdt,

			currency: payment.payment.currency,
			status: payment.payment.status
		},
		offer: {
			id: payment.offer!.id,
			name: payment.offer!.name,
			pickupTimeFrom: payment.offer!.pickupTimeFrom,
			pickupTimeUntil: payment.offer!.pickupTimeUntil
		},
		platformWalletAddress: TETHER_CONTRACT_ADDRESS,
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

		try {
			// Get payment
			const [payment] = await db
				.select()
				.from(payments)
				.where(eq(payments.id, params.paymentId))
				.limit(1);

			if (!payment) {
				return setError(form, '', 'Payment not found');
			}

			// Verify ownership
			if (payment.userAccountId !== account.id) {
				return setError(form, '', 'Unauthorized');
			}

			// Check status
			if (payment.status === 'completed') {
				throw redirect(303, `/reservations/${payment.reservationId}`);
			}

			if (payment.status === 'failed') {
				return setError(form, '', 'Payment has failed');
			}

			// Verify Tether payment using the correct method
			const result = await PaymentHandler.verifyTetherPayment({
				paymentId: payment.id,
				txHash: form.data.txHash
			});

			if (!result.success) {
				return setError(form, 'txHash', result.error || 'Verification failed');
			}

			// Redirect to reservation
			throw redirect(303, `/reservations/${result.reservationId}`);
		} catch (err) {
			if (err instanceof Response) throw err;
			console.error('Payment verification error:', err);
			return setError(form, '', err instanceof Error ? err.message : 'Unknown error');
		}
	}
};
