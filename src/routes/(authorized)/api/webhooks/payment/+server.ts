// src/routes/api/webhooks/payment/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db.js';
import { payments } from '#lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { PaymentHandler } from '#lib/server/payments/handler.js';
import { PAYMENT_WEBHOOK_SECRET, ZARINPAL_WEBHOOK_SECRET } from '$app/env/private';
import crypto from 'crypto';

/**
 * Verify webhook signature
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
	const hmac = crypto.createHmac('sha256', secret);
	hmac.update(payload);
	const digest = hmac.digest('hex');
	return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * POST /api/webhooks/payment
 * Handles payment webhooks from various providers
 */
export const POST: RequestHandler = async ({ request }) => {
	const signature = request.headers.get('x-webhook-signature');
	const provider = request.headers.get('x-payment-provider'); // 'zarinpal' or 'tether'

	if (!signature) {
		throw error(401, 'Missing signature');
	}

	const rawBody = await request.text();

	// Verify signature
	const secret = provider === 'zarinpal' ? ZARINPAL_WEBHOOK_SECRET : PAYMENT_WEBHOOK_SECRET;
	if (!verifySignature(rawBody, signature, secret)) {
		throw error(401, 'Invalid signature');
	}

	const body = JSON.parse(rawBody);

	try {
		if (provider === 'zarinpal') {
			return await handleZarinpalWebhook(body);
		} else if (provider === 'tether') {
			return await handleTetherWebhook(body);
		} else {
			throw error(400, 'Unknown payment provider');
		}
	} catch (err) {
		console.error('Webhook error:', err);
		throw error(500, 'Webhook processing failed');
	}
};

/**
 * Handle Zarinpal webhook. Verification, failure handling and reservation
 * creation are done by the same handler as the browser callback.
 */
async function handleZarinpalWebhook(body: Record<string, unknown>) {
	const { authority, status, payment_id } = body;

	if (typeof payment_id !== 'string' || typeof authority !== 'string') {
		throw error(400, 'Missing payment_id or authority');
	}

	const [payment] = await db.select().from(payments).where(eq(payments.id, payment_id)).limit(1);

	if (!payment) {
		throw error(404, 'Payment not found');
	}

	if (payment.status === 'completed') {
		return json({ success: true, message: 'Already processed' });
	}

	const result = await PaymentHandler.completeZarinpalPayment({
		paymentId: payment_id,
		authority,
		status: status === 'OK' || status === 'success' ? 'OK' : String(status ?? 'NOK')
	});

	return json(result);
}

/**
 * Handle Tether (blockchain) webhook, e.g. from a blockchain monitoring
 * service. The handler verifies the transaction on chain itself.
 */
async function handleTetherWebhook(body: Record<string, unknown>) {
	const { tx_hash, payment_id } = body;

	if (typeof payment_id !== 'string' || typeof tx_hash !== 'string') {
		throw error(400, 'Missing required fields');
	}

	const [payment] = await db.select().from(payments).where(eq(payments.id, payment_id)).limit(1);

	if (!payment) {
		throw error(404, 'Payment not found');
	}

	if (payment.status === 'completed') {
		return json({ success: true, message: 'Already processed' });
	}

	const result = await PaymentHandler.verifyTetherPayment({ paymentId: payment_id, txHash: tx_hash });

	return json(result);
}

/**
 * GET /api/webhooks/payment (for testing)
 */
export const GET: RequestHandler = async () => {
	return json({
		status: 'ok',
		message: 'Payment webhook endpoint is active'
	});
};

