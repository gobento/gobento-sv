// src/lib/server/payments/currency.ts
/**
 * Currency conversion service with live rates
 * Uses CoinGecko free API (no auth required)
 */

import { FEE_PERCENTAGE } from '$env/static/private';

interface ConversionRates {
	EUR_TO_USDT: number;
	IRR_TO_USDT: number;
	lastUpdated: Date;
}

export class CurrencyService {
	private rates: ConversionRates | null = null;
	private lastFetch: Date | null = null;
	private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

	/**
	 * Fetch live conversion rates from CoinGecko
	 */
	private async fetchRates(): Promise<ConversionRates> {
		try {
			// CoinGecko free API - no auth needed
			// Gets USDT price in EUR and IRR
			const response = await fetch(
				'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=eur,irr',
				{
					headers: {
						Accept: 'application/json'
					}
				}
			);

			if (!response.ok) {
				throw new Error(`CoinGecko API error: ${response.status}`);
			}

			const data = await response.json();

			// CoinGecko returns: { tether: { eur: 0.92, irr: 41500 } }
			// We need the inverse: 1 EUR = X USDT, 1 IRR = X USDT
			const usdtPriceInEur = data.tether.eur; // e.g., 0.92 EUR per USDT
			const usdtPriceInIrr = data.tether.irr; // e.g., 41500 IRR per USDT

			return {
				EUR_TO_USDT: 1 / usdtPriceInEur, // e.g., 1.087 USDT per EUR
				IRR_TO_USDT: 1 / usdtPriceInIrr, // e.g., 0.000024 USDT per IRR
				lastUpdated: new Date()
			};
		} catch (error) {
			console.error('Failed to fetch conversion rates from CoinGecko:', error);

			// Fallback to hardcoded rates if API fails
			console.warn('Using fallback conversion rates');
			return {
				EUR_TO_USDT: 1.08,
				IRR_TO_USDT: 0.000024,
				lastUpdated: new Date()
			};
		}
	}

	/**
	 * Get current conversion rates (cached for 5 minutes)
	 */
	async getRates(): Promise<ConversionRates> {
		const now = new Date();

		// Return cached rates if fresh
		if (
			this.rates &&
			this.lastFetch &&
			now.getTime() - this.lastFetch.getTime() < this.CACHE_DURATION_MS
		) {
			return this.rates;
		}

		// Fetch fresh rates
		this.rates = await this.fetchRates();
		this.lastFetch = now;

		return this.rates;
	}

	/**
	 * Convert amount to USDT with proper rounding (always round UP)
	 */
	async convertToUsdt(
		amount: number,
		fromCurrency: string
	): Promise<{
		amountUsdt: number;
		rate: number;
		timestamp: Date;
	}> {
		console.log('amount', amount);
		console.log('fromCurrency', fromCurrency);

		if (fromCurrency === 'USDT') {
			return {
				amountUsdt: Math.ceil(amount * 100) / 100,
				rate: 1,
				timestamp: new Date()
			};
		}

		const rates = await this.getRates();
		let rate: number;

		if (fromCurrency === 'EUR') {
			rate = rates.EUR_TO_USDT;
		} else if (fromCurrency === 'IRR') {
			rate = rates.IRR_TO_USDT;
		} else {
			throw new Error(`Unsupported currency: ${fromCurrency}`);
		}

		const usdtAmount = amount * rate;

		// ALWAYS round UP to 2 decimal places
		const roundedAmount = Math.ceil(usdtAmount * 100) / 100;

		return {
			amountUsdt: roundedAmount,
			rate,
			timestamp: rates.lastUpdated
		};
	}
}

export function priceWithMargin(businessPrice: number) {
	return Math.ceil(businessPrice * (1 + parseInt(FEE_PERCENTAGE) / 100));
}
