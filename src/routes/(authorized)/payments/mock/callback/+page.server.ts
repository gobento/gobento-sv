// src/routes/payments/callback/+page.server.ts

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { payments } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { ZarinpalService } from '$lib/server/payments/zarinpal';
import { PaymentHandler } from '$lib/server/payments/handler';

export const load: PageServerLoad = async ({ url, locals }) => {
	const session = locals.session;
	const account = locals.account;

	if (!session || !account) {
		throw error(401, 'Unauthorized');
	}

	// Get query parameters from Zarinpal callback
	const authority = url.searchParams.get('Authority');
	const status = url.searchParams.get('Status');
	const paymentId = url.searchParams.get('paymentId');

	if (!authority || !paymentId) {
		throw error(400, 'Invalid callback parameters');
	}

	// Check if payment was cancelled
	if (status === 'NOK') {
		await PaymentHandler.failPayment(paymentId, 'Payment cancelled by user');
		throw redirect(303, '/offers?error=payment_cancelled');
	}

	// Get payment record
	const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);

	if (!payment) {
		throw error(404, 'Payment not found');
	}

	// Verify payment is from correct user
	if (payment.userAccountId !== account.id) {
		throw error(403, 'Unauthorized');
	}

	// Verify payment with Zarinpal
	const verifyResult = await ZarinpalService.verifyPayment({
		authority,
		amount: payment.amount
	});

	if (!verifyResult.success) {
		await PaymentHandler.failPayment(
			paymentId,
			verifyResult.error || 'Payment verification failed'
		);
		throw redirect(303, `/offers/${payment.offerId}?error=payment_failed`);
	}

	// Complete payment and create reservation
	const completeResult = await PaymentHandler.completePayment({
		paymentId: payment.id,
		zarinpalAuthority: authority,
		zarinpalRefId: verifyResult.refId
	});

	if (!completeResult.success) {
		throw redirect(303, `/offers/${payment.offerId}?error=reservation_failed`);
	}

	// Transfer platform fee (10%)
	if (payment.feeAmount > 0) {
		await ZarinpalService.transferFee({
			amount: payment.feeAmount,
			description: `Platform fee for payment ${paymentId}`
		});
	}

	// Success! Redirect to reservation
	throw redirect(303, `/reservations/${completeResult.reservationId}?success=true`);
};
