// src/routes/api/webhooks/payment/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { payments } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { PaymentHandler } from '$lib/server/payments/handler';
import { ZarinpalService } from '$lib/server/payments/zarinpal';
import { TetherService } from '$lib/server/payments/tether';
import { PAYMENT_WEBHOOK_SECRET, ZARINPAL_WEBHOOK_SECRET } from '$env/static/private';
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
 * Handle Zarinpal webhook
 */
async function handleZarinpalWebhook(body: any) {
	const { authority, status, ref_id, amount, payment_id } = body;

	if (!payment_id) {
		throw error(400, 'Missing payment_id');
	}

	// Get payment record
	const [payment] = await db.select().from(payments).where(eq(payments.id, payment_id)).limit(1);

	if (!payment) {
		throw error(404, 'Payment not found');
	}

	// Check if already processed
	if (payment.status === 'completed') {
		return json({ success: true, message: 'Already processed' });
	}

	// Handle payment status
	if (status === 'success' || status === 'OK') {
		// Verify with Zarinpal
		const verifyResult = await ZarinpalService.verifyPayment({
			authority,
			amount: payment.amount
		});

		if (!verifyResult.success) {
			await PaymentHandler.failPayment(payment_id, verifyResult.error || 'Verification failed');
			return json({ success: false, error: 'Verification failed' });
		}

		// Complete payment and create reservation
		const completeResult = await PaymentHandler.completePayment({
			paymentId: payment_id,
			zarinpalAuthority: authority,
			zarinpalRefId: ref_id
		});

		if (!completeResult.success) {
			return json({ success: false, error: completeResult.error });
		}

		// Transfer platform fee
		if (payment.feeAmount > 0) {
			await ZarinpalService.transferFee({
				amount: payment.feeAmount,
				description: `Platform fee for payment ${payment_id}`
			});
		}

		return json({
			success: true,
			reservationId: completeResult.reservationId
		});
	} else {
		// Payment failed or cancelled
		await PaymentHandler.failPayment(payment_id, 'Payment failed or cancelled');
		return json({ success: false, error: 'Payment failed' });
	}
}

/**
 * Handle Tether (blockchain) webhook
 * This could be triggered by a blockchain monitoring service
 */
async function handleTetherWebhook(body: any) {
	const { tx_hash, from_address, to_address, amount, payment_id, confirmations } = body;

	if (!payment_id || !tx_hash) {
		throw error(400, 'Missing required fields');
	}

	// Get payment record
	const [payment] = await db.select().from(payments).where(eq(payments.id, payment_id)).limit(1);

	if (!payment) {
		throw error(404, 'Payment not found');
	}

	// Check if already processed
	if (payment.status === 'completed') {
		return json({ success: true, message: 'Already processed' });
	}

	// Verify transaction on blockchain
	const tetherService = new TetherService();
	const verifyResult = await tetherService.verifyPayment({
		txHash: tx_hash,
		expectedAmount: payment.amount,
		recipientAddress: to_address
	});

	if (!verifyResult.success) {
		await PaymentHandler.failPayment(
			payment_id,
			verifyResult.error || 'Transaction verification failed'
		);
		return json({ success: false, error: 'Verification failed' });
	}

	// Check confirmations (require at least 12 for USDT)
	if ((verifyResult.confirmations || 0) < 12) {
		return json({
			success: false,
			error: 'Insufficient confirmations',
			confirmations: verifyResult.confirmations
		});
	}

	// Complete payment and create reservation
	const completeResult = await PaymentHandler.completePayment({
		paymentId: payment_id,
		tetherTxHash: tx_hash,
		tetherFromAddress: from_address
	});

	if (!completeResult.success) {
		return json({ success: false, error: completeResult.error });
	}

	// Transfer platform fee
	// Note: In production, you'd want to collect fees in a secure wallet
	// and process them in batches to save on gas fees
	if (payment.feeAmount > 0) {
		// Optional: Transfer fee automatically
		// In practice, you might want to do this manually in batches
		console.log(`Fee to collect: ${payment.feeAmount} USDT from payment ${payment_id}`);
	}

	return json({
		success: true,
		reservationId: completeResult.reservationId
	});
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
