// src/lib/server/payments/zarinpal.ts

import { ZARINPAL_MERCHANT_ID, ZARINPAL_SANDBOX, MOCK_PAYMENTS } from '$env/static/private';
import { env } from '$env/dynamic/private';

interface ZarinpalRequestResponse {
	data: {
		code: number;
		message: string;
		authority: string;
		fee_type: string;
		fee: number;
	};
	errors: any[];
}

interface ZarinpalVerifyResponse {
	data: {
		code: number;
		message: string;
		card_hash: string;
		card_pan: string;
		ref_id: number;
		fee_type: string;
		fee: number;
	};
	errors: any[];
}

const ZARINPAL_API_URL =
	ZARINPAL_SANDBOX === 'true'
		? 'https://sandbox.zarinpal.com/pg/v4/payment'
		: 'https://api.zarinpal.com/pg/v4/payment';

const ZARINPAL_PAYMENT_URL =
	ZARINPAL_SANDBOX === 'true'
		? 'https://sandbox.zarinpal.com/pg/StartPay'
		: 'https://www.zarinpal.com/pg/StartPay';

export class ZarinpalService {
	/**
	 * Request a payment from Zarinpal
	 * User will be redirected to Zarinpal gateway to complete payment
	 * Payment goes to our platform merchant account first
	 */
	static async requestPayment(params: {
		amount: number; // Amount in IRR
		description: string;
		email?: string;
		mobile?: string;
		callbackUrl: string;
		metadata?: Record<string, any>;
	}): Promise<{ success: boolean; authority?: string; paymentUrl?: string; error?: string }> {
		// Mock mode - simulate payment gateway
		if (MOCK_PAYMENTS === 'true') {
			const mockAuthority = `MOCK_${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
			return {
				success: true,
				authority: mockAuthority,
				paymentUrl: `${env.PUBLIC_APP_URL}/payments/mock?authority=${mockAuthority}&amount=${params.amount}`
			};
		}

		try {
			const response = await fetch(`${ZARINPAL_API_URL}/request.json`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify({
					merchant_id: ZARINPAL_MERCHANT_ID,
					amount: params.amount,
					description: params.description,
					callback_url: params.callbackUrl,
					metadata: {
						email: params.email,
						mobile: params.mobile,
						...params.metadata
					}
				})
			});

			const result: ZarinpalRequestResponse = await response.json();

			if (result.data.code === 100) {
				return {
					success: true,
					authority: result.data.authority,
					paymentUrl: `${ZARINPAL_PAYMENT_URL}/${result.data.authority}`
				};
			} else {
				return {
					success: false,
					error: result.data.message || 'Payment request failed'
				};
			}
		} catch (error) {
			console.error('Zarinpal request error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Verify a payment with Zarinpal
	 * This confirms the user completed payment on Zarinpal gateway
	 * Money is now in our platform merchant account
	 */
	static async verifyPayment(params: {
		authority: string;
		amount: number;
	}): Promise<{ success: boolean; refId?: number; error?: string }> {
		// Mock mode - always succeed
		if (MOCK_PAYMENTS === 'true') {
			if (params.authority.startsWith('MOCK_')) {
				return {
					success: true,
					refId: Math.floor(Math.random() * 1000000)
				};
			}
		}

		try {
			const response = await fetch(`${ZARINPAL_API_URL}/verify.json`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify({
					merchant_id: ZARINPAL_MERCHANT_ID,
					authority: params.authority,
					amount: params.amount
				})
			});

			const result: ZarinpalVerifyResponse = await response.json();

			// Code 100 = successful payment
			// Code 101 = payment already verified
			if (result.data.code === 100 || result.data.code === 101) {
				return {
					success: true,
					refId: result.data.ref_id
				};
			} else {
				return {
					success: false,
					error: result.data.message || 'Payment verification failed'
				};
			}
		} catch (error) {
			console.error('Zarinpal verify error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Transfer business portion from platform account to business IBAN
	 * This happens after we receive payment and take our fee
	 * In production, this would use Zarinpal's payout API or bank transfer
	 */
	static async transferToBusiness(params: {
		amount: number;
		ibanNumber: string;
		description: string;
	}): Promise<{ success: boolean; error?: string }> {
		if (MOCK_PAYMENTS === 'true') {
			console.log(`[MOCK] Transferring ${params.amount} IRR to IBAN ${params.ibanNumber}`);
			console.log(`[MOCK] Description: ${params.description}`);
			return { success: true };
		}

		// In production, implement one of these:
		// 1. Zarinpal Payout API (if available)
		// 2. Batch bank transfer process
		// 3. Manual processing queue for admin review

		// For now, log for manual processing
		console.log('Business transfer pending:', {
			amount: params.amount,
			iban: params.ibanNumber,
			description: params.description
		});

		// TODO: Implement actual transfer logic
		// This could be:
		// - Automated bank transfer via banking API
		// - Queue for batch processing
		// - Admin dashboard for manual approval

		return { success: true };
	}
}
