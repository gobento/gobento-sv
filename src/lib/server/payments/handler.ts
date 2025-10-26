// src/lib/server/payments/handler.ts

import { db } from '$lib/server/db';
import { payments, reservations, businessOffers } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { ZarinpalService } from './zarinpal';
import { TetherService } from './tether';

export type PaymentMethod = 'zarinpal' | 'tether';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

interface CreatePaymentParams {
	offerId: string;
	userAccountId: string;
	businessAccountId: string;
	amount: number;
	currency: 'IRR' | 'USDT';
	paymentMethod: PaymentMethod;
	pickupDate: Date;
	metadata?: Record<string, any>;
}

interface CompletePaymentParams {
	paymentId: string;
	zarinpalAuthority?: string;
	zarinpalRefId?: number;
	tetherTxHash?: string;
	tetherFromAddress?: string;
}

export class PaymentHandler {
	/**
	 * Create a new payment record
	 */
	static async createPayment(params: CreatePaymentParams): Promise<{
		success: boolean;
		paymentId?: string;
		payment?: any;
		error?: string;
	}> {
		try {
			console.log('createPayment:', params);

			// Calculate fee split
			const split =
				params.paymentMethod === 'zarinpal'
					? ZarinpalService.calculateSplit(params.amount)
					: TetherService.calculateSplit(params.amount);

			// Create payment record
			const paymentId = crypto.randomUUID();
			const expiresAt = new Date();
			expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minute expiry

			const [payment] = await db
				.insert(payments)
				.values({
					id: paymentId,
					offerId: params.offerId,
					userAccountId: params.userAccountId,
					businessAccountId: params.businessAccountId,
					amount: params.amount,
					currency: params.currency,
					paymentMethod: params.paymentMethod,
					feeAmount: split.feeAmount,
					businessAmount: split.businessAmount,
					status: 'pending',
					isMock: process.env.MOCK_PAYMENTS === 'true',
					metadata: params.metadata ? JSON.stringify(params.metadata) : null,
					expiresAt
				})
				.returning();

			return {
				success: true,
				paymentId: payment.id,
				payment
			};
		} catch (error) {
			console.error('Create payment error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Complete a payment and create reservation
	 */
	static async completePayment(params: CompletePaymentParams): Promise<{
		success: boolean;
		reservationId?: string;
		error?: string;
	}> {
		try {
			console.log('completePayment:', params);

			// Get payment record
			const [payment] = await db
				.select()
				.from(payments)
				.where(eq(payments.id, params.paymentId))
				.limit(1);

			if (!payment) {
				return { success: false, error: 'Payment not found' };
			}

			if (payment.status === 'completed') {
				return { success: false, error: 'Payment already completed' };
			}

			if (payment.status === 'failed') {
				return { success: false, error: 'Payment has failed' };
			}

			// Get offer details for reservation
			const [offer] = await db
				.select()
				.from(businessOffers)
				.where(eq(businessOffers.id, payment.offerId))
				.limit(1);

			if (!offer) {
				return { success: false, error: 'Offer not found' };
			}

			// Parse metadata for pickup date
			const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
			const pickupDate = metadata.pickupDate ? new Date(metadata.pickupDate) : new Date();

			// Parse pickup time
			const [fromHours, fromMinutes] = offer.pickupTimeFrom.split(':').map(Number);
			const [untilHours, untilMinutes] = offer.pickupTimeUntil.split(':').map(Number);

			const pickupFrom = new Date(pickupDate);
			pickupFrom.setHours(fromHours, fromMinutes, 0, 0);

			const pickupUntil = new Date(pickupDate);
			pickupUntil.setHours(untilHours, untilMinutes, 0, 0);

			// Generate claim token
			const claimToken = this.generateClaimToken();

			// Create reservation
			const reservationId = crypto.randomUUID();
			await db.insert(reservations).values({
				id: reservationId,
				offerId: payment.offerId,
				userAccountId: payment.userAccountId,
				status: 'active',
				pickupFrom,
				pickupUntil,
				claimToken
			});

			// Update payment record
			await db
				.update(payments)
				.set({
					status: 'completed',
					completedAt: new Date(),
					reservationId,
					zarinpalAuthority: params.zarinpalAuthority,
					zarinpalRefId: params.zarinpalRefId?.toString(),
					tetherTxHash: params.tetherTxHash,
					tetherFromAddress: params.tetherFromAddress
				})
				.where(eq(payments.id, params.paymentId));

			return {
				success: true,
				reservationId
			};
		} catch (error) {
			console.error('Complete payment error:', error);

			// Mark payment as failed
			await db
				.update(payments)
				.set({
					status: 'failed',
					errorMessage: error instanceof Error ? error.message : 'Unknown error'
				})
				.where(eq(payments.id, params.paymentId));

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Fail a payment
	 */
	static async failPayment(paymentId: string, errorMessage: string): Promise<void> {
		await db
			.update(payments)
			.set({
				status: 'failed',
				errorMessage
			})
			.where(eq(payments.id, paymentId));
	}

	/**
	 * Generate claim token
	 */
	private static generateClaimToken(): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let token = '';
		const array = new Uint8Array(8);
		crypto.getRandomValues(array);
		for (let i = 0; i < 8; i++) {
			token += chars[array[i] % chars.length];
		}
		return token;
	}

	/**
	 * Check if payment is expired
	 */
	static async checkExpiredPayments(): Promise<void> {
		const now = new Date();

		await db
			.update(payments)
			.set({
				status: 'failed',
				errorMessage: 'Payment expired'
			})
			.where(eq(payments.status, 'pending'))
			.where(eq(payments.expiresAt, now));
	}
}
