import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db.js';
import { payments } from '#lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { PaymentHandler } from '#lib/server/payments/handler.js';

/** Sends the customer back to checkout, keeping the pickup day they had chosen. */
function checkoutUrl(payment: { offerId: string; metadata: string | null }, code: string): string {
	const query = new URLSearchParams({ error: code });
	try {
		const pickupDate = payment.metadata ? JSON.parse(payment.metadata).pickupDate : null;
		if (typeof pickupDate === 'string' && !isNaN(new Date(pickupDate).getTime())) {
			const day = new Date(pickupDate);
			const pad = (value: number) => value.toString().padStart(2, '0');
			query.set(
				'pickupDate',
				`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
			);
		}
	} catch {
		// Metadata is best effort; checkout falls back to today.
	}
	return `/offers/${payment.offerId}/payment?${query}`;
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'user') {
		throw error(403, 'Only user accounts can make payments');
	}

	const authority = url.searchParams.get('Authority');
	const status = url.searchParams.get('Status');
	const paymentId = url.searchParams.get('paymentId');

	if (!authority || !status || !paymentId) {
		throw error(400, 'Invalid callback parameters');
	}

	const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);

	if (!payment) {
		throw error(404, 'Payment not found');
	}

	if (payment.userAccountId !== account.id) {
		throw error(403, 'Unauthorized');
	}

	if (payment.status === 'completed') {
		if (payment.reservationId) {
			throw redirect(303, `/reservations/${payment.reservationId}`);
		}
		throw redirect(303, checkoutUrl(payment, 'already_processed'));
	}

	if (payment.status === 'failed') {
		throw redirect(303, checkoutUrl(payment, 'payment_failed'));
	}

	// Verifies with the gateway and creates the reservation. A cancelled payment
	// (Status=NOK) is recorded as failed in there as well.
	const result = await PaymentHandler.completeZarinpalPayment({
		paymentId: payment.id,
		authority,
		status
	});

	if (!result.success) {
		if (status !== 'OK') {
			throw redirect(303, checkoutUrl(payment, 'payment_cancelled'));
		}
		console.error('Payment completion failed:', result.error);
		throw redirect(303, checkoutUrl(payment, 'payment_failed'));
	}

	if (!result.reservationId) {
		// Paid, but the reservation could not be created; the orders list is the
		// safest place to land while support sorts it out.
		console.error('Payment completed without a reservation:', payment.id);
		throw redirect(303, '/reservations');
	}

	throw redirect(303, `/reservations/${result.reservationId}?success=true`);
};
