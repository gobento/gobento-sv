// src/lib/server/payments/verification.ts
/**
 * Payment method verification.
 *
 * Before a payment method is trusted for real payouts we confirm it with a
 * lightweight "test payment" against the same rails the platform uses for live
 * transactions:
 *   - `tether`  -> validated + a test payment request through {@link TetherService}
 *   - `iban`    -> validated + a test authorization through {@link ZarinpalService}
 *
 * The Zarinpal/IBAN rail is the one that accepts Visa/bank cards and Iranian
 * bank transfers, so a single `iban` verification covers all of those cases.
 *
 * When the mock backend is enabled (`MOCK=true`) both rails respond
 * deterministically, so verification succeeds without any real network calls.
 */
import { ethers } from 'ethers';
import { APP_URL } from '$env/static/private';
import { TetherService } from './tether';
import { ZarinpalService } from './zarinpal';
import { isValidIban } from './iban';

export interface PaymentMethodVerificationResult {
	success: boolean;
	error?: string;
}

/** Minimal test amount (IRR) used to authorize the bank/card rail. */
const IBAN_TEST_AMOUNT = 10000;
/** Minimal test amount (USDT) used to authorize the crypto rail. */
const TETHER_TEST_AMOUNT = 1;

export class PaymentMethodVerifier {
	private static tetherService = new TetherService();

	/**
	 * Confirm a USDT (ERC-20) wallet address by validating it and running a
	 * test payment request against the Tether rail.
	 */
	static async verifyTether(address: string): Promise<PaymentMethodVerificationResult> {
		const trimmed = address.trim();

		if (!ethers.isAddress(trimmed)) {
			return { success: false, error: 'Invalid USDT (ERC-20) wallet address' };
		}

		const result = await this.tetherService.generatePaymentRequest({
			businessWalletAddress: trimmed,
			amount: TETHER_TEST_AMOUNT,
			orderId: `verify-${crypto.randomUUID()}`
		});

		if (!result.success) {
			return {
				success: false,
				error: result.error || 'Test payment to the USDT wallet failed'
			};
		}

		return { success: true };
	}

	/**
	 * Confirm a bank account by validating the IBAN and running a test payment
	 * authorization through the bank/card gateway. This rail covers Visa/bank
	 * cards and Iranian bank transfers.
	 */
	static async verifyIban(ibanNumber: string): Promise<PaymentMethodVerificationResult> {
		const normalized = ibanNumber.trim().replace(/\s+/g, '');

		if (!isValidIban(normalized)) {
			return { success: false, error: 'Invalid IBAN number' };
		}

		const result = await ZarinpalService.requestPayment({
			amount: IBAN_TEST_AMOUNT,
			description: 'Payment method verification',
			callbackUrl: `${APP_URL}/payments/callback`,
			metadata: { verification: true }
		});

		if (!result.success) {
			return {
				success: false,
				error: result.error || 'Test payment to the bank account failed'
			};
		}

		return { success: true };
	}

	/**
	 * Verify a single payment method by kind.
	 */
	static async verify(params: {
		method: 'iban' | 'tether';
		ibanNumber?: string | null;
		tetherAddress?: string | null;
	}): Promise<PaymentMethodVerificationResult> {
		if (params.method === 'iban') {
			return this.verifyIban(params.ibanNumber ?? '');
		}
		return this.verifyTether(params.tetherAddress ?? '');
	}
}
