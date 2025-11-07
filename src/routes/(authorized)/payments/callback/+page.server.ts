// src/routes/(authorized)/payments/callback/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { payments } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { PaymentHandler } from '$lib/server/payments/handler';
import { MOCK_PAYMENTS } from '$env/static/private';

export const load: PageServerLoad = async ({ url, locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'user') {
		throw error(403, 'Only user accounts can make payments');
	}

	// Get query parameters from Zarinpal callback
	const authority = url.searchParams.get('Authority');
	const status = url.searchParams.get('Status');
	const paymentId = url.searchParams.get('paymentId');

	console.log('Payment callback:', { authority, status, paymentId });

	if (!authority || !paymentId) {
		console.error('Missing callback parameters');
		throw error(400, 'Invalid callback parameters');
	}

	// Get payment record
	const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);

	if (!payment) {
		console.error('Payment not found:', paymentId);
		throw error(404, 'Payment not found');
	}

	// Verify payment is from correct user
	if (payment.userAccountId !== account.id) {
		console.error('Unauthorized payment access');
		throw error(403, 'Unauthorized');
	}

	// Check if payment was cancelled by user
	if (status === 'NOK') {
		console.log('Payment cancelled by user');
		await PaymentHandler.failPayment(paymentId, 'Payment cancelled by user');
		throw redirect(303, `/offers/${payment.offerId}?error=payment_cancelled`);
	}

	// Check if already processed
	if (payment.status === 'completed') {
		console.log('Payment already completed, redirecting to reservation');
		if (payment.reservationId) {
			throw redirect(303, `/reservations/${payment.reservationId}?success=true`);
		}
		throw redirect(303, `/offers/${payment.offerId}?error=already_processed`);
	}

	if (payment.status === 'failed') {
		console.log('Payment previously failed');
		throw redirect(303, `/offers/${payment.offerId}?error=payment_failed`);
	}

	// Complete payment (verifies with Zarinpal and creates reservation)
	console.log('Completing payment...');
	const completeResult = await PaymentHandler.completeZarinpalPayment({
		paymentId: payment.id,
		authority: authority,
		status: status!
	});

	if (!completeResult.success) {
		console.error('Payment completion failed:', completeResult.error);
		throw redirect(
			303,
			`/offers/${payment.offerId}?error=${completeResult.error || 'payment_failed'}`
		);
	}

	console.log('Payment completed successfully, reservation:', completeResult.reservationId);

	// Success! Redirect to reservation
	throw redirect(303, `/reservations/${completeResult.reservationId}?success=true`);
};
