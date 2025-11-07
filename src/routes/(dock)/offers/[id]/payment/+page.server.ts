// src/routes/(dock)/offers/[id]/payment/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { businessOffers, businessWallets, reservations } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { PaymentHandler } from '$lib/server/payments/handler';
import { TETHER_CONTRACT_ADDRESS } from '$env/static/private';
import { superValidate, setError } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { initPaymentSchema } from './schema';
import { priceWithMargin } from '$lib/server/payments/currency';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const account = locals.account!;

	if (account.accountType !== 'user') {
		throw error(403, 'Only user accounts can make payments');
	}

	// Get offer
	const [offer] = await db
		.select()
		.from(businessOffers)
		.where(eq(businessOffers.id, params.id))
		.limit(1);

	if (!offer) {
		throw error(404, 'Offer not found');
	}

	if (!offer.isActive) {
		throw redirect(303, `/offers/${params.id}`);
	}

	// Check if already reserved
	const existingReservation = await db
		.select()
		.from(reservations)
		.where(and(eq(reservations.offerId, params.id), eq(reservations.status, 'active')))
		.limit(1);

	if (existingReservation.length > 0) {
		throw redirect(303, `/offers/${params.id}`);
	}

	// Get business payment methods
	const [wallet] = await db
		.select()
		.from(businessWallets)
		.where(eq(businessWallets.accountId, offer.businessAccountId))
		.limit(1);

	if (!wallet || (!wallet.ibanEnabled && !wallet.tetherEnabled)) {
		throw error(500, 'Business has not configured payment methods');
	}

	// Get pickup date from URL or use default
	const pickupDate = url.searchParams.get('pickupDate') || new Date().toISOString().slice(0, 10);

	// Create form with initial data
	const form = await superValidate(
		{ paymentMethod: wallet.preferredPaymentMethod, pickupDate },
		valibot(initPaymentSchema)
	);

	const price = priceWithMargin(offer.price);

	return {
		offer: {
			id: offer.id,
			name: offer.name,
			price: price,
			currency: wallet.ibanEnabled ? 'EUR' : 'IRR',
			isRecurring: offer.isRecurring
		},
		businessPaymentMethods: {
			ibanEnabled: wallet.ibanEnabled,
			tetherEnabled: wallet.tetherEnabled,
			preferredMethod: wallet.preferredPaymentMethod
		},
		pickupDate,
		form
	};
};

export const actions: Actions = {
	initPayment: async ({ params, locals, request }) => {
		const account = locals.account!;

		if (account.accountType !== 'user') {
			throw error(403, 'Only user accounts can make payments');
		}

		const form = await superValidate(request, valibot(initPaymentSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { paymentMethod, pickupDate: pickupDateStr } = form.data;

		const pickupDate = new Date(pickupDateStr);
		if (isNaN(pickupDate.getTime())) {
			return setError(form, 'pickupDate', 'Invalid pickup date');
		}

		// Get offer
		const [offer] = await db
			.select()
			.from(businessOffers)
			.where(eq(businessOffers.id, params.id))
			.limit(1);

		if (!offer) {
			throw error(404, 'Offer not found');
		}

		if (!offer.isActive) {
			return setError(form, '', 'Offer is not active');
		}

		// Check if already reserved
		const existingReservation = await db
			.select()
			.from(reservations)
			.where(and(eq(reservations.offerId, params.id), eq(reservations.status, 'active')))
			.limit(1);

		if (existingReservation.length > 0) {
			return setError(form, '', 'Offer is already reserved');
		}

		// Verify business accepts this payment method
		const [wallet] = await db
			.select()
			.from(businessWallets)
			.where(eq(businessWallets.accountId, offer.businessAccountId))
			.limit(1);

		if (!wallet) {
			return setError(form, '', 'Business payment configuration not found');
		}

		if (paymentMethod === 'iban' && !wallet.ibanEnabled) {
			return setError(form, 'paymentMethod', 'Business does not accept IBAN payments');
		}

		if (paymentMethod === 'tether' && !wallet.tetherEnabled) {
			return setError(form, 'paymentMethod', 'Business does not accept USDT payments');
		}

		// Initiate payment
		const currency = paymentMethod === 'tether' ? 'USDT' : wallet.ibanEnabled ? 'EUR' : 'IRR';

		const price = priceWithMargin(offer.price);

		const paymentResult = await PaymentHandler.initiatePayment({
			offerId: params.id,
			userAccountId: account.id,
			businessAccountId: offer.businessAccountId,
			amount: price,
			currency,
			paymentMethod,
			pickupDate,
			metadata: {
				pickupDate: pickupDateStr,
				offerName: offer.name,
				email: account.email
			}
		});

		if (!paymentResult.success) {
			return setError(form, '', paymentResult.error || 'Failed to initialize payment');
		}

		console.log('paymentResult', paymentResult);

		// Return payment details
		if (paymentMethod === 'iban') {
			return {
				form,
				success: true,
				paymentId: paymentResult.paymentId,
				paymentMethod: 'iban',
				zarinpalAuthority: paymentResult.zarinpalAuthority,
				zarinpalPaymentUrl: paymentResult.zarinpalPaymentUrl,
				amount: price,
				currency,
				pickupDate: pickupDateStr,
				offerName: offer.name
			};
		} else if (paymentMethod === 'tether') {
			return {
				form,
				success: true,
				paymentId: paymentResult.paymentId,
				paymentMethod: 'tether',
				platformWalletAddress: TETHER_CONTRACT_ADDRESS,
				amountUsdt: paymentResult.amountUsdt,
				pickupDate: pickupDateStr,
				offerName: offer.name
			};
		}

		return setError(form, 'paymentMethod', 'Invalid payment method');
	}
};
