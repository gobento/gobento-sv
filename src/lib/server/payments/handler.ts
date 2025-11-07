// src/lib/server/payments/handler.ts
import { db } from '$lib/server/db';
import { payments, businessWallets, reservations } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { TetherService } from './tether';
import { ZarinpalService } from './zarinpal';
import { CurrencyService } from './currency';
import { SettlementService } from './settlement';

export class PaymentHandler {
	private static tetherService = new TetherService();
	private static currencyService = new CurrencyService();

	/**
	 * Calculate platform fee (round UP to ensure we cover costs)
	 */
	private static calculateFee(amount: number, paymentMethod: 'iban' | 'tether'): number {
		const feePercentage = paymentMethod === 'iban' ? 0.05 : 0.03; // 5% for IBAN, 3% for Tether
		const fee = amount * feePercentage;

		// Round fee UP to 2 decimal places
		return Math.ceil(fee * 100) / 100;
	}

	/**
	 * Calculate business amount (what they receive after fees)
	 * Round DOWN to ensure we don't overpay
	 */
	private static calculateBusinessAmount(amount: number, fee: number): number {
		const businessAmount = amount - fee;

		// Round DOWN to 2 decimal places (floor instead of ceil)
		return Math.floor(businessAmount * 100) / 100;
	}

	/**
	 * Generate unique claim token for reservation
	 */
	private static generateClaimToken(): string {
		return `CLAIM-${crypto.randomUUID()}`;
	}

	static async initiatePayment(params: {
		offerId: string;
		userAccountId: string;
		businessAccountId: string;
		amount: number;
		currency: string;
		paymentMethod: 'iban' | 'tether';
		pickupDate: Date;
		metadata?: Record<string, any>;
	}): Promise<{
		success: boolean;
		paymentId?: string;
		zarinpalAuthority?: string;
		zarinpalPaymentUrl?: string;
		tetherAddress?: string;
		amountUsdt?: number;
		conversionRate?: number;
		error?: string;
	}> {
		try {
			// Get live conversion to USDT
			const conversion = await this.currencyService.convertToUsdt(params.amount, params.currency);

			// Calculate fees (on original amount)
			const feeAmount = this.calculateFee(params.amount, params.paymentMethod);
			const businessAmount = this.calculateBusinessAmount(params.amount, feeAmount);

			// Calculate fee and business amounts in USDT as well
			const feeAmountUsdt = this.calculateFee(conversion.amountUsdt, params.paymentMethod);
			const businessAmountUsdt = this.calculateBusinessAmount(conversion.amountUsdt, feeAmountUsdt);

			console.log('conversion', conversion);
			console.log('feeAmountUsdt', feeAmountUsdt);
			console.log('businessAmountUsdt', businessAmountUsdt);
			console.log('params.amount', params.amount);

			// Create payment record with USDT amount stored
			const [payment] = await db
				.insert(payments)
				.values({
					id: crypto.randomUUID(),
					offerId: params.offerId,
					userAccountId: params.userAccountId,
					businessAccountId: params.businessAccountId,
					amount: params.amount,
					currency: params.currency,
					amountUsdt: conversion.amountUsdt, // ALWAYS store USDT equivalent
					paymentMethod: params.paymentMethod,
					feeAmount,
					businessAmount,
					status: 'pending',
					payoutStatus: 'pending_payout',
					metadata: JSON.stringify({
						...params.metadata,
						pickupDate: params.pickupDate.toISOString(),
						calculatedAt: new Date().toISOString(),
						conversionRate: conversion.rate,
						conversionTimestamp: conversion.timestamp.toISOString(),
						feeAmountUsdt,
						businessAmountUsdt,
						conversionNote:
							params.currency === 'USDT'
								? 'Direct USDT payment'
								: `Converted from ${params.currency} at rate ${conversion.rate.toFixed(6)} (via CoinGecko)`
					}),
					expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
				})
				.returning();

			// Handle payment method
			if (params.paymentMethod === 'iban') {
				// Initiate Zarinpal payment
				const callbackUrl = `${process.env.PUBLIC_APP_URL || 'http://localhost:5173'}/payments/verify?paymentId=${payment.id}`;

				const zarinpalResult = await ZarinpalService.requestPayment({
					amount: params.amount,
					description: `Payment for offer ${params.offerId}`,
					email: params.metadata?.email,
					callbackUrl,
					metadata: {
						paymentId: payment.id,
						offerId: params.offerId
					}
				});

				if (!zarinpalResult.success) {
					// Update payment status to failed
					await db
						.update(payments)
						.set({
							status: 'failed',
							errorMessage: zarinpalResult.error
						})
						.where(eq(payments.id, payment.id));

					return {
						success: false,
						error: zarinpalResult.error
					};
				}

				// Update payment with Zarinpal reference
				await db
					.update(payments)
					.set({
						ibanReference: zarinpalResult.authority,
						status: 'processing'
					})
					.where(eq(payments.id, payment.id));

				return {
					success: true,
					paymentId: payment.id,
					zarinpalAuthority: zarinpalResult.authority,
					zarinpalPaymentUrl: zarinpalResult.paymentUrl,
					amountUsdt: conversion.amountUsdt,
					conversionRate: conversion.rate
				};
			} else if (params.paymentMethod === 'tether') {
				// Get business wallet for USDT transfers
				const [wallet] = await db
					.select()
					.from(businessWallets)
					.where(eq(businessWallets.accountId, params.businessAccountId))
					.limit(1);

				// If business doesn't have USDT wallet, try IBAN fallback
				if (!wallet?.tetherAddress || !wallet.tetherEnabled) {
					if (wallet?.ibanNumber && wallet.ibanEnabled) {
						// Fallback to IBAN payment
						console.log('Business USDT wallet not configured, falling back to IBAN');

						return await this.initiatePayment({
							...params,
							paymentMethod: 'iban'
						});
					}

					await db
						.update(payments)
						.set({
							status: 'failed',
							errorMessage: 'Business wallet not configured for either USDT or IBAN'
						})
						.where(eq(payments.id, payment.id));

					return {
						success: false,
						error: 'Business wallet not configured'
					};
				}

				// Generate payment request (user pays to platform wallet)
				const tetherResult = await this.tetherService.generatePaymentRequest({
					businessWalletAddress: wallet.tetherAddress,
					amount: conversion.amountUsdt, // Use calculated USDT amount
					orderId: payment.id
				});

				if (!tetherResult.success) {
					await db
						.update(payments)
						.set({
							status: 'failed',
							errorMessage: tetherResult.error
						})
						.where(eq(payments.id, payment.id));

					return {
						success: false,
						error: tetherResult.error
					};
				}

				// Update payment status
				await db
					.update(payments)
					.set({
						status: 'processing'
					})
					.where(eq(payments.id, payment.id));

				return {
					success: true,
					paymentId: payment.id,
					tetherAddress: process.env.TETHER_PLATFORM_ADDRESS,
					amountUsdt: conversion.amountUsdt,
					conversionRate: conversion.rate
				};
			}

			return {
				success: false,
				error: 'Invalid payment method'
			};
		} catch (error) {
			console.error('Payment initiation error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Create reservation after payment is completed
	 */
	private static async createReservation(params: {
		paymentId: string;
		offerId: string;
		userAccountId: string;
		pickupDate: Date;
	}): Promise<{ success: boolean; reservationId?: string; error?: string }> {
		try {
			const pickupFrom = params.pickupDate;
			const pickupUntil = new Date(pickupFrom.getTime() + 3600000); // +1 hour

			const [reservation] = await db
				.insert(reservations)
				.values({
					id: crypto.randomUUID(),
					offerId: params.offerId,
					userAccountId: params.userAccountId,
					status: 'active',
					pickupFrom,
					pickupUntil,
					claimToken: this.generateClaimToken()
				})
				.returning();

			// Link payment to reservation
			await db
				.update(payments)
				.set({
					reservationId: reservation.id
				})
				.where(eq(payments.id, params.paymentId));

			return {
				success: true,
				reservationId: reservation.id
			};
		} catch (error) {
			console.error('Reservation creation error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Complete Zarinpal payment after user returns from gateway
	 */
	static async completeZarinpalPayment(params: {
		paymentId: string;
		authority: string;
		status: string;
	}): Promise<{
		success: boolean;
		reservationId?: string;
		error?: string;
	}> {
		try {
			// Use transaction with row locking to prevent race conditions
			return await db.transaction(async (tx) => {
				// Get payment record with row lock
				const [payment] = await tx
					.select()
					.from(payments)
					.where(eq(payments.id, params.paymentId))
					.for('update') // Locks the row
					.limit(1);

				if (!payment) {
					return { success: false, error: 'Payment not found' };
				}

				if (payment.status !== 'processing') {
					return { success: false, error: 'Payment is not in processing state' };
				}

				// Check if user cancelled
				if (params.status !== 'OK') {
					await tx
						.update(payments)
						.set({
							status: 'failed',
							errorMessage: 'Payment cancelled by user'
						})
						.where(eq(payments.id, params.paymentId));

					return {
						success: false,
						error: 'Payment cancelled'
					};
				}

				// Verify payment with Zarinpal
				const verifyResult = await ZarinpalService.verifyPayment({
					authority: params.authority,
					amount: payment.amount
				});

				if (!verifyResult.success) {
					await tx
						.update(payments)
						.set({
							status: 'failed',
							errorMessage: verifyResult.error
						})
						.where(eq(payments.id, params.paymentId));

					return {
						success: false,
						error: verifyResult.error
					};
				}

				// Payment verified - update status
				await tx
					.update(payments)
					.set({
						status: 'completed',
						ibanReference: `REF_${verifyResult.refId}`,
						completedAt: new Date(),
						payoutStatus: 'queued_for_payout'
					})
					.where(eq(payments.id, params.paymentId));

				// Create reservation
				const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
				const pickupDate = metadata.pickupDate ? new Date(metadata.pickupDate) : new Date();

				const reservationResult = await this.createReservation({
					paymentId: payment.id,
					offerId: payment.offerId,
					userAccountId: payment.userAccountId,
					pickupDate
				});

				if (!reservationResult.success) {
					// Log error but don't fail the payment
					console.error('Failed to create reservation:', reservationResult.error);
				}

				// Add payment to monthly settlement
				// This queues it for batch payout at end of month
				try {
					await SettlementService.addPaymentToSettlement(payment.id);
				} catch (error) {
					console.error('Failed to add payment to settlement:', error);
					// Don't fail the payment, just log it
				}

				return {
					success: true,
					reservationId: reservationResult.reservationId
				};
			});
		} catch (error) {
			console.error('Zarinpal completion error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Verify USDT payment transaction
	 */
	static async verifyTetherPayment(params: { paymentId: string; txHash: string }): Promise<{
		success: boolean;
		reservationId?: string;
		error?: string;
	}> {
		try {
			// Check for idempotency - has this txHash been processed?
			const [existingPayment] = await db
				.select()
				.from(payments)
				.where(and(eq(payments.tetherTxHash, params.txHash), eq(payments.status, 'completed')))
				.limit(1);

			if (existingPayment) {
				return {
					success: true,
					reservationId: existingPayment.reservationId || undefined
				};
			}

			// Use transaction with row locking
			return await db.transaction(async (tx) => {
				// Get payment record with lock
				const [payment] = await tx
					.select()
					.from(payments)
					.where(eq(payments.id, params.paymentId))
					.for('update') // Locks the row
					.limit(1);

				if (!payment) {
					return { success: false, error: 'Payment not found' };
				}

				if (payment.status !== 'processing') {
					return { success: false, error: 'Payment is not in processing state' };
				}

				// Verify the blockchain transaction
				const verifyResult = await this.tetherService.verifyPayment({
					txHash: params.txHash,
					expectedAmount: payment.amountUsdt!, // Use stored USDT amount
					recipientAddress: process.env.TETHER_PLATFORM_ADDRESS!
				});

				if (!verifyResult.success) {
					await tx
						.update(payments)
						.set({
							status: 'failed',
							errorMessage: verifyResult.error,
							tetherTxHash: params.txHash
						})
						.where(eq(payments.id, params.paymentId));

					return {
						success: false,
						error: verifyResult.error
					};
				}

				// Payment verified - update status
				await tx
					.update(payments)
					.set({
						status: 'completed',
						tetherTxHash: params.txHash,
						tetherFromAddress: verifyResult.from,
						completedAt: new Date(),
						payoutStatus: 'queued_for_payout'
					})
					.where(eq(payments.id, params.paymentId));

				// Create reservation
				const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
				const pickupDate = metadata.pickupDate ? new Date(metadata.pickupDate) : new Date();

				const reservationResult = await this.createReservation({
					paymentId: payment.id,
					offerId: payment.offerId,
					userAccountId: payment.userAccountId,
					pickupDate
				});

				if (!reservationResult.success) {
					console.error('Failed to create reservation:', reservationResult.error);
				}

				// Add payment to monthly settlement
				// Business will receive payout at end of month
				try {
					await SettlementService.addPaymentToSettlement(payment.id);
				} catch (error) {
					console.error('Failed to add payment to settlement:', error);
				}

				return {
					success: true,
					reservationId: reservationResult.reservationId
				};
			});
		} catch (error) {
			console.error('Tether verification error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}
}
