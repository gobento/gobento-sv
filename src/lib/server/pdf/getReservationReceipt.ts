// src/lib/server/pdf/getReservationReceipt.ts
import { db } from '$lib/server/db';
import { reservations, payments, businessOffers, accounts } from '$lib/server/schema';
import { and, desc, eq } from 'drizzle-orm';
import { createPaymentReceipt } from './createPaymentReceipt';

export type ReceiptResult =
	{ ok: true; base64: string; filename: string } | { ok: false; status: number; message: string };

/**
 * Build a payment receipt PDF for a reservation belonging to a given user.
 *
 * Verifies that the reservation exists and is owned by the requesting user,
 * then locates the associated completed payment and renders it as a PDF.
 *
 * @param reservationId - The reservation to generate a receipt for
 * @param userAccountId - The account requesting the receipt (must own the reservation)
 * @returns The PDF encoded as base64 plus a suggested filename, or an error result
 */
export async function getReservationReceipt(
	reservationId: string,
	userAccountId: string
): Promise<ReceiptResult> {
	const [reservation] = await db
		.select()
		.from(reservations)
		.where(eq(reservations.id, reservationId));

	if (!reservation) {
		return { ok: false, status: 404, message: 'Reservation not found' };
	}

	// Only the buyer (reservation owner) may download the receipt, since it
	// contains their personal payment details.
	if (reservation.userAccountId !== userAccountId) {
		return { ok: false, status: 403, message: 'You do not have access to this receipt' };
	}

	// Find the payment linked to this reservation, preferring a completed one.
	const [payment] = await db
		.select()
		.from(payments)
		.where(and(eq(payments.reservationId, reservationId), eq(payments.status, 'completed')))
		.orderBy(desc(payments.completedAt))
		.limit(1);

	if (!payment) {
		return {
			ok: false,
			status: 404,
			message: 'No completed payment found for this reservation'
		};
	}

	const [offer] = await db
		.select()
		.from(businessOffers)
		.where(eq(businessOffers.id, payment.offerId));

	const [user] = await db.select().from(accounts).where(eq(accounts.id, payment.userAccountId));

	const [business] = await db
		.select()
		.from(accounts)
		.where(eq(accounts.id, payment.businessAccountId));

	if (!offer || !user || !business) {
		return { ok: false, status: 404, message: 'Receipt data is incomplete' };
	}

	const pdfBuffer = await createPaymentReceipt({ payment, user, business, offer });

	return {
		ok: true,
		base64: pdfBuffer.toString('base64'),
		filename: `receipt-${payment.id}.pdf`
	};
}
