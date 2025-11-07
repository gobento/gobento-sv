// src/routes/(dock)/offers/[id]/payment/tether/[paymentId]/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { payments } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { PaymentHandler } from '$lib/server/payments/handler';
import { superValidate, setError } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { txHashSchema } from './schema';

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'user') {
		throw error(403, 'Only user accounts can make payments');
	}

	console.log('params', params);

	// Get payment record
	const [payment] = await db
		.select()
		.from(payments)
		.where(eq(payments.id, params.paymentId))
		.limit(1);

	if (!payment) {
		throw error(404, 'Payment not found');
	}

	// Verify ownership
	if (payment.userAccountId !== account.id) {
		throw error(403, 'Payment does not belong to this user');
	}

	// Check status
	if (payment.status === 'completed') {
		throw error(400, 'Payment already completed');
	}

	if (payment.status === 'failed') {
		throw error(400, 'Payment has failed');
	}

	// Parse metadata
	const metadata = payment.metadata as any;

	// Create form with paymentId pre-filled
	const form = await superValidate(
		{ paymentId: params.paymentId, txHash: '' },
		valibot(txHashSchema)
	);

	console.log('form', form);

	return {
		offerId: payment.offerId,
		offerName: metadata?.offerName || 'Offer',
		amountUsdt: 2, // todo should be payment.amountUsdt,
		platformWalletAddress: metadata?.platformWalletAddress || '',
		pickupDate: metadata?.pickupDate || '',
		form
	};
};

export const actions: Actions = {
	verifyTetherPayment: async ({ params, locals, request }) => {
		const account = locals.account!;

		const form = await superValidate(request, valibot(txHashSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const { txHash, paymentId } = form.data;

			// Verify paymentId matches route param
			if (paymentId !== params.paymentId) {
				return setError(form, '', 'Payment ID mismatch');
			}

			// Find payment record
			const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);

			if (!payment) {
				return setError(form, '', 'Payment not found');
			}

			// Verify ownership
			if (payment.userAccountId !== account.id) {
				return setError(form, '', 'Payment does not belong to this user');
			}

			// Check status
			if (payment.status === 'completed') {
				return setError(form, '', 'Payment already processed');
			}

			if (payment.status === 'failed') {
				return setError(form, '', 'Payment has failed. Please try again.');
			}

			if (payment.status !== 'pending' && payment.status !== 'processing') {
				return setError(form, '', `Cannot verify payment in ${payment.status} status`);
			}

			// Complete payment
			const completeResult = await PaymentHandler.completePayment({
				paymentId: payment.id,
				tetherTxHash: txHash
			});

			if (!completeResult.success) {
				return setError(form, 'txHash', completeResult.error || 'Failed to verify payment');
			}

			return {
				form,
				success: true,
				reservationId: completeResult.reservationId
			};
		} catch (err) {
			console.error('Verify Tether Payment Error:', err);
			return setError(form, '', err instanceof Error ? err.message : 'Unknown error occurred');
		}
	}
};
