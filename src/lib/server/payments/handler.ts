// src/lib/server/payments/handler.ts

import { db } from '$lib/server/db';
import { payments, reservations, businessOffers, businessWallets } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { ZarinpalService } from './zarinpal';
import { TetherService } from './tether';

export type PaymentMethod = 'iban' | 'tether';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

interface CreatePaymentParams {
	offerId: string;
	userAccountId: string;
	businessAccountId: string;
	amount: number;
	currency: 'IRR' | 'USDT' | 'EUR';
	paymentMethod: PaymentMethod;
	pickupDate: Date;
	metadata?: Record<string, any>;
}

interface InitiatePaymentResult {
	success: boolean;
	paymentId?: string;
	// For IBAN/Zarinpal
	zarinpalAuthority?: string;
	zarinpalPaymentUrl?: string;
	// For Tether
	platformWalletAddress?: string;
	amountUsdt?: string;
	// Common
	error?: string;
}

interface CompletePaymentParams {
	paymentId: string;
	// Zarinpal
	zarinpalAuthority?: string;
	zarinpalRefId?: number;
	// Tether
	tetherTxHash?: string;
	tetherFromAddress?: string;
}

export class PaymentHandler {
	/**
	 * Step 1: Initiate payment
	 * Creates payment record and returns payment instructions
	 */
	static async initiatePayment(params: CreatePaymentParams): Promise<InitiatePaymentResult> {
		try {
			console.log('initiatePayment:', params);

			// Get business wallet info
			const [businessWallet] = await db
				.select()
				.from(businessWallets)
				.where(eq(businessWallets.accountId, params.businessAccountId))
				.limit(1);

			if (!businessWallet) {
				return { success: false, error: 'Business wallet not configured' };
			}

			// Verify business accepts this payment method
			if (params.paymentMethod === 'iban' && !businessWallet.ibanEnabled) {
				return { success: false, error: 'Business does not accept IBAN payments' };
			}

			if (params.paymentMethod === 'tether' && !businessWallet.tetherEnabled) {
				return { success: false, error: 'Business does not accept Tether payments' };
			}

			// Calculate fee split (10% platform fee)
			const split = this.calculateSplit(params.amount);

			// Create payment record
			const paymentId = crypto.randomUUID();
			const expiresAt = new Date();
			expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minute expiry

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

			// Handle payment method specific initialization
			if (params.paymentMethod === 'iban') {
				// Zarinpal payment request
				const zarinpalResult = await ZarinpalService.requestPayment({
					amount: params.amount,
					description: `Payment for ${params.metadata?.offerName || 'offer'}`,
					email: params.metadata?.email,
					mobile: params.metadata?.mobile,
					callbackUrl: `${process.env.PUBLIC_APP_URL}/payments/callback?paymentId=${paymentId}`,
					metadata: params.metadata
				});

				if (!zarinpalResult.success) {
					await this.failPayment(
						paymentId,
						zarinpalResult.error || 'Payment initialization failed'
					);
					return { success: false, error: zarinpalResult.error };
				}

				// Update payment with authority
				await db
					.update(payments)
					.set({
						ibanReference: zarinpalResult.authority
					})
					.where(eq(payments.id, paymentId));

				return {
					success: true,
					paymentId,
					zarinpalAuthority: zarinpalResult.authority,
					zarinpalPaymentUrl: zarinpalResult.paymentUrl
				};
			} else if (params.paymentMethod === 'tether') {
				// Tether payment - user sends to platform wallet
				const tetherService = new TetherService();
				const paymentRequest = await tetherService.generatePaymentRequest({
					businessWalletAddress: process.env.FEE_TETHER_ADDRESS!, // Platform wallet receives first
					amount: params.amount,
					orderId: paymentId
				});

				if (!paymentRequest.success) {
					await this.failPayment(
						paymentId,
						paymentRequest.error || 'Payment initialization failed'
					);
					return { success: false, error: paymentRequest.error };
				}

				return {
					success: true,
					paymentId,
					platformWalletAddress: paymentRequest.recipientAddress,
					amountUsdt: paymentRequest.amount
				};
			}

			return { success: false, error: 'Invalid payment method' };
		} catch (error) {
			console.error('Initiate payment error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Step 2: Verify and complete payment
	 * Verifies the payment was received, then creates reservation and transfers to business
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

			// Update to processing
			await db
				.update(payments)
				.set({ status: 'processing' })
				.where(eq(payments.id, params.paymentId));

			// Verify payment based on method
			let verificationSuccess = false;

			if (payment.paymentMethod === 'iban') {
				if (!params.zarinpalAuthority) {
					throw new Error('Missing Zarinpal authority');
				}

				const verifyResult = await ZarinpalService.verifyPayment({
					authority: params.zarinpalAuthority,
					amount: payment.amount
				});

				verificationSuccess = verifyResult.success;

				if (verificationSuccess) {
					await db
						.update(payments)
						.set({
							ibanReference: params.zarinpalAuthority,
							metadata: JSON.stringify({
								...(payment.metadata ? JSON.parse(payment.metadata) : {}),
								zarinpalRefId: params.zarinpalRefId
							})
						})
						.where(eq(payments.id, params.paymentId));
				}
			} else if (payment.paymentMethod === 'tether') {
				if (!params.tetherTxHash) {
					throw new Error('Missing transaction hash');
				}

				const tetherService = new TetherService();
				const verifyResult = await tetherService.verifyPayment({
					txHash: params.tetherTxHash,
					expectedAmount: payment.amount,
					recipientAddress: process.env.FEE_TETHER_ADDRESS! // Verify sent to platform
				});

				verificationSuccess = verifyResult.success;

				if (verificationSuccess) {
					await db
						.update(payments)
						.set({
							tetherTxHash: params.tetherTxHash,
							tetherFromAddress: params.tetherFromAddress || verifyResult.from
						})
						.where(eq(payments.id, params.paymentId));
				}
			}

			if (!verificationSuccess) {
				await this.failPayment(params.paymentId, 'Payment verification failed');
				return { success: false, error: 'Payment verification failed' };
			}

			// Get offer details for reservation
			const [offer] = await db
				.select()
				.from(businessOffers)
				.where(eq(businessOffers.id, payment.offerId))
				.limit(1);

			if (!offer) {
				throw new Error('Offer not found');
			}

			// Parse metadata for pickup date
			const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
			const pickupDate = metadata.pickupDate ? new Date(metadata.pickupDate) : new Date();

			// Calculate pickup times
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

			// Mark payment as completed
			await db
				.update(payments)
				.set({
					status: 'completed',
					completedAt: new Date(),
					reservationId
				})
				.where(eq(payments.id, params.paymentId));

			// Step 3: Transfer business portion (background task)
			// This happens after we've received payment in our platform wallet
			this.transferToBusinessAsync(payment.id).catch((err) => {
				console.error('Failed to transfer to business:', err);
			});

			return {
				success: true,
				reservationId
			};
		} catch (error) {
			console.error('Complete payment error:', error);

			// Mark payment as failed
			await this.failPayment(
				params.paymentId,
				error instanceof Error ? error.message : 'Unknown error'
			);

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Step 3: Transfer business portion (async, happens after reservation created)
	 * Transfer from platform wallet to business wallet
	 */
	private static async transferToBusinessAsync(paymentId: string): Promise<void> {
		try {
			const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);

			if (!payment || payment.status !== 'completed') {
				return;
			}

			// Get business wallet
			const [businessWallet] = await db
				.select()
				.from(businessWallets)
				.where(eq(businessWallets.accountId, payment.businessAccountId))
				.limit(1);

			if (!businessWallet) {
				console.error('Business wallet not found for payment:', paymentId);
				return;
			}

			if (payment.paymentMethod === 'iban') {
				// For Zarinpal, transfer business amount to their account
				await ZarinpalService.transferToBusiness({
					amount: payment.businessAmount,
					ibanNumber: businessWallet.ibanNumber!,
					description: `Payment for order ${paymentId}`
				});
			} else if (payment.paymentMethod === 'tether') {
				// For Tether, send from platform wallet to business wallet
				const tetherService = new TetherService();
				await tetherService.transferFromPlatform({
					toAddress: businessWallet.tetherAddress!,
					amount: payment.businessAmount
				});
			}

			// Log successful transfer
			console.log(`Transferred ${payment.businessAmount} to business for payment ${paymentId}`);
		} catch (error) {
			console.error('Transfer to business failed:', error);
			// TODO: Add retry logic or manual intervention queue
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
	 * Calculate fee split (10% platform fee)
	 */
	private static calculateSplit(amount: number): {
		businessAmount: number;
		feeAmount: number;
	} {
		const feeAmount = Math.round(amount * 0.1 * 100) / 100;
		const businessAmount = Math.round((amount - feeAmount) * 100) / 100;

		return {
			businessAmount,
			feeAmount
		};
	}

	/**
	 * Check and expire old pending payments
	 */
	static async expirePendingPayments(): Promise<void> {
		const now = new Date();

		const expiredPayments = await db
			.select()
			.from(payments)
			.where(and(eq(payments.status, 'pending')));

		for (const payment of expiredPayments) {
			if (payment.expiresAt && payment.expiresAt < now) {
				await this.failPayment(payment.id, 'Payment expired');
			}
		}
	}
}
