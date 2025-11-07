// src/lib/server/payments/settlement.ts
import { db } from '$lib/server/db';
import {
	payments,
	businessWallets,
	monthlySettlements,
	settlementPayments
} from '$lib/server/schema';
import { eq, and, gte, lt, isNull } from 'drizzle-orm';
import { TetherService } from './tether';
import { ZarinpalService } from './zarinpal';

export class SettlementService {
	private static tetherService = new TetherService();

	/**
	 * Add completed payment to monthly settlement
	 */
	static async addPaymentToSettlement(paymentId: string): Promise<void> {
		const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);

		if (!payment || payment.status !== 'completed') {
			throw new Error('Payment not completed');
		}

		if (payment.settlementId) {
			// Already in a settlement
			return;
		}

		const now = new Date();
		const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const year = now.getFullYear();

		// Get or create settlement for this business and month
		await db.transaction(async (tx) => {
			// Try to find existing settlement
			let [settlement] = await tx
				.select()
				.from(monthlySettlements)
				.where(
					and(
						eq(monthlySettlements.businessAccountId, payment.businessAccountId),
						eq(monthlySettlements.month, month),
						eq(monthlySettlements.year, year)
					)
				)
				.limit(1);

			// Create if doesn't exist
			if (!settlement) {
				const [wallet] = await tx
					.select()
					.from(businessWallets)
					.where(eq(businessWallets.accountId, payment.businessAccountId))
					.limit(1);

				[settlement] = await tx
					.insert(monthlySettlements)
					.values({
						id: crypto.randomUUID(),
						businessAccountId: payment.businessAccountId,
						month,
						year,
						ibanCurrency: payment.currency,
						status: 'pending'
					})
					.returning();
			}

			// Add payment to settlement
			await tx.insert(settlementPayments).values({
				id: crypto.randomUUID(),
				settlementId: settlement.id,
				paymentId: payment.id,
				businessAmount: payment.businessAmount,
				currency: payment.currency,
				paymentMethod: payment.paymentMethod
			});

			// Update settlement totals
			if (payment.paymentMethod === 'iban') {
				await tx
					.update(monthlySettlements)
					.set({
						ibanTotalAmount: settlement.ibanTotalAmount + payment.businessAmount,
						ibanPaymentCount: settlement.ibanPaymentCount + 1,
						ibanCurrency: payment.currency,
						updatedAt: new Date()
					})
					.where(eq(monthlySettlements.id, settlement.id));
			} else if (payment.paymentMethod === 'tether') {
				const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
				const businessAmountUsdt = metadata.businessAmountUsdt || 0;

				await tx
					.update(monthlySettlements)
					.set({
						tetherTotalAmount: settlement.tetherTotalAmount + businessAmountUsdt,
						tetherPaymentCount: settlement.tetherPaymentCount + 1,
						updatedAt: new Date()
					})
					.where(eq(monthlySettlements.id, settlement.id));
			}

			// Link payment to settlement
			await tx
				.update(payments)
				.set({
					settlementId: settlement.id,
					payoutStatus: 'queued_for_payout'
				})
				.where(eq(payments.id, payment.id));
		});
	}

	/**
	 * Process monthly payouts for a specific month
	 * Should be run as a cron job at the end of each month
	 */
	static async processMonthlyPayouts(
		month: string,
		year: number
	): Promise<{
		success: boolean;
		processed: number;
		failed: number;
		errors: Array<{ settlementId: string; error: string }>;
	}> {
		const settlements = await db
			.select()
			.from(monthlySettlements)
			.where(
				and(
					eq(monthlySettlements.month, month),
					eq(monthlySettlements.year, year),
					eq(monthlySettlements.status, 'pending')
				)
			);

		let processed = 0;
		let failed = 0;
		const errors: Array<{ settlementId: string; error: string }> = [];

		for (const settlement of settlements) {
			try {
				await this.processSettlement(settlement.id);
				processed++;
			} catch (error) {
				failed++;
				errors.push({
					settlementId: settlement.id,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		}

		return {
			success: failed === 0,
			processed,
			failed,
			errors
		};
	}

	/**
	 * Process a single settlement (both IBAN and Tether if applicable)
	 */
	static async processSettlement(settlementId: string): Promise<void> {
		await db.transaction(async (tx) => {
			const [settlement] = await tx
				.select()
				.from(monthlySettlements)
				.where(eq(monthlySettlements.id, settlementId))
				.for('UPDATE') // Lock the row
				.limit(1);

			if (!settlement) {
				throw new Error('Settlement not found');
			}

			if (settlement.status !== 'pending') {
				throw new Error('Settlement already processed or processing');
			}

			// Mark as processing
			await tx
				.update(monthlySettlements)
				.set({
					status: 'processing',
					updatedAt: new Date()
				})
				.where(eq(monthlySettlements.id, settlementId));

			// Get business wallet
			const [wallet] = await tx
				.select()
				.from(businessWallets)
				.where(eq(businessWallets.accountId, settlement.businessAccountId))
				.limit(1);

			if (!wallet) {
				throw new Error('Business wallet not configured');
			}

			let ibanSuccess = true;
			let tetherSuccess = true;
			let ibanError: string | null = null;
			let tetherError: string | null = null;

			// Process IBAN payout if applicable
			if (settlement.ibanTotalAmount > 0 && wallet.ibanEnabled && wallet.ibanNumber) {
				try {
					const ibanResult = await ZarinpalService.transferToBusiness({
						amount: settlement.ibanTotalAmount,
						ibanNumber: wallet.ibanNumber,
						description: `Monthly payout for ${settlement.month} (${settlement.ibanPaymentCount} payments)`
					});

					if (ibanResult.success) {
						await tx
							.update(monthlySettlements)
							.set({
								ibanPaidAt: new Date(),
								ibanTransactionRef: ibanResult.transactionRef,
								updatedAt: new Date()
							})
							.where(eq(monthlySettlements.id, settlementId));

						// Update related payments
						await this.updatePaymentPayoutStatus(tx, settlementId, 'iban', 'paid_out');
					} else {
						ibanSuccess = false;
						ibanError = ibanResult.error || 'Unknown error';
						await tx
							.update(monthlySettlements)
							.set({
								ibanPayoutError: ibanError,
								updatedAt: new Date()
							})
							.where(eq(monthlySettlements.id, settlementId));
					}
				} catch (error) {
					ibanSuccess = false;
					ibanError = error instanceof Error ? error.message : 'Unknown error';
					await tx
						.update(monthlySettlements)
						.set({
							ibanPayoutError: ibanError,
							updatedAt: new Date()
						})
						.where(eq(monthlySettlements.id, settlementId));
				}
			}

			// Process Tether payout if applicable
			if (settlement.tetherTotalAmount > 0 && wallet.tetherEnabled && wallet.tetherAddress) {
				try {
					const tetherResult = await this.tetherService.transferFromPlatform({
						toAddress: wallet.tetherAddress,
						amount: settlement.tetherTotalAmount
					});

					if (tetherResult.success) {
						await tx
							.update(monthlySettlements)
							.set({
								tetherPaidAt: new Date(),
								tetherTxHash: tetherResult.txHash,
								updatedAt: new Date()
							})
							.where(eq(monthlySettlements.id, settlementId));

						// Update related payments
						await this.updatePaymentPayoutStatus(tx, settlementId, 'tether', 'paid_out');
					} else {
						tetherSuccess = false;
						tetherError = tetherResult.error || 'Unknown error';
						await tx
							.update(monthlySettlements)
							.set({
								tetherPayoutError: tetherError,
								updatedAt: new Date()
							})
							.where(eq(monthlySettlements.id, settlementId));
					}
				} catch (error) {
					tetherSuccess = false;
					tetherError = error instanceof Error ? error.message : 'Unknown error';
					await tx
						.update(monthlySettlements)
						.set({
							tetherPayoutError: tetherError,
							updatedAt: new Date()
						})
						.where(eq(monthlySettlements.id, settlementId));
				}
			}

			// Determine final status
			let finalStatus: 'paid' | 'failed' | 'partially_paid';
			if (ibanSuccess && tetherSuccess) {
				finalStatus = 'paid';
			} else if (!ibanSuccess && !tetherSuccess) {
				finalStatus = 'failed';
			} else {
				finalStatus = 'partially_paid';
			}

			await tx
				.update(monthlySettlements)
				.set({
					status: finalStatus,
					updatedAt: new Date()
				})
				.where(eq(monthlySettlements.id, settlementId));

			// If failed, update payment statuses
			if (finalStatus === 'failed') {
				await this.updatePaymentPayoutStatus(tx, settlementId, null, 'payout_failed');
			}
		});
	}

	/**
	 * Update payout status for payments in a settlement
	 */
	private static async updatePaymentPayoutStatus(
		tx: any,
		settlementId: string,
		paymentMethod: 'iban' | 'tether' | null,
		status: 'paid_out' | 'payout_failed'
	): Promise<void> {
		const settlementPaymentRecords = await tx
			.select()
			.from(settlementPayments)
			.where(
				and(
					eq(settlementPayments.settlementId, settlementId),
					paymentMethod ? eq(settlementPayments.paymentMethod, paymentMethod) : undefined
				)
			);

		for (const record of settlementPaymentRecords) {
			await tx
				.update(payments)
				.set({
					payoutStatus: status,
					paidOutAt: status === 'paid_out' ? new Date() : null
				})
				.where(eq(payments.id, record.paymentId));
		}
	}

	/**
	 * Get settlement summary for a business
	 */
	static async getBusinessSettlementSummary(
		businessAccountId: string,
		month?: string,
		year?: number
	): Promise<any> {
		let query = null;

		if (month && year) {
			db.select()
				.from(monthlySettlements)
				.where(eq(monthlySettlements.businessAccountId, businessAccountId));
			and(eq(monthlySettlements.month, month), eq(monthlySettlements.year, year));
		} else {
			query = db
				.select()
				.from(monthlySettlements)
				.where(eq(monthlySettlements.businessAccountId, businessAccountId));
		}

		return await query;
	}

	/**
	 * Get payments in a settlement
	 */
	static async getSettlementPayments(settlementId: string): Promise<any> {
		return await db
			.select({
				payment: payments,
				settlementPayment: settlementPayments
			})
			.from(settlementPayments)
			.innerJoin(payments, eq(settlementPayments.paymentId, payments.id))
			.where(eq(settlementPayments.settlementId, settlementId));
	}
}
