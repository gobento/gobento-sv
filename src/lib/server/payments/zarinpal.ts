// src/lib/server/payments/zarinpal.ts

import {
	ZARINPAL_MERCHANT_ID,
	ZARINPAL_SANDBOX,
	PUBLIC_APP_URL,
	FEE_ZARINPAL_MERCHANT_ID,
	MOCK_PAYMENTS
} from '$env/static/private';

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
	 */
	static async requestPayment(params: {
		amount: number; // Amount in IRR
		description: string;
		email?: string;
		mobile?: string;
		callbackUrl: string;
		metadata?: Record<string, any>;
	}): Promise<{ success: boolean; authority?: string; paymentUrl?: string; error?: string }> {
		// Mock mode
		if (MOCK_PAYMENTS === 'true') {
			const mockAuthority = `MOCK_${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
			return {
				success: true,
				authority: mockAuthority,
				paymentUrl: `${PUBLIC_APP_URL}/payments/mock?authority=${mockAuthority}`
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
	 */
	static async verifyPayment(params: {
		authority: string;
		amount: number;
	}): Promise<{ success: boolean; refId?: number; error?: string }> {
		// Mock mode
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
	 * Split payment - send fee to platform
	 * Note: Zarinpal doesn't natively support payment splitting,
	 * so we handle this manually after successful payment
	 */
	static async transferFee(params: {
		amount: number;
		description: string;
	}): Promise<{ success: boolean; error?: string }> {
		if (MOCK_PAYMENTS === 'true') {
			console.log(`[MOCK] Would transfer fee: ${params.amount} IRR to platform`);
			return { success: true };
		}

		// In production, you would:
		// 1. Use Zarinpal's payout API to transfer to platform account
		// 2. Or handle this through your business logic
		// 3. Or use Zarinpal's wage feature if available

		console.log(`Fee transfer: ${params.amount} IRR - ${params.description}`);
		return { success: true };
	}

	/**
	 * Calculate fee split (90% to business, 10% to platform)
	 */
	static calculateSplit(amount: number): {
		businessAmount: number;
		feeAmount: number;
	} {
		const feeAmount = Math.round(amount * 0.1);
		const businessAmount = amount - feeAmount;

		return {
			businessAmount,
			feeAmount
		};
	}
}
