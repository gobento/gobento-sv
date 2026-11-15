import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '#lib/server/db.js';
import {
	businessLocations,
	businessOffers,
	businessProfiles,
	businessWallets,
	reservations
} from '#lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import { PaymentHandler } from '#lib/server/payments/handler.js';
import { TETHER_CONTRACT_ADDRESS } from '$app/env/private';
import { superValidate, setError } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { initPaymentSchema } from './schema';
import { priceWithMargin } from '#lib/server/payments/currency.js';

/** Combines the chosen day with the offer's daily pickup time (server-local wall clock). */
function pickupMoment(day: string, time: string): Date {
	return new Date(`${day}T${time.length === 5 ? `${time}:00` : time}`);
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const account = locals.account!;

	if (account.accountType !== 'user') {
		throw error(403, 'Only user accounts can make payments');
	}

	const [offer] = await db
		.select({
			id: businessOffers.id,
			name: businessOffers.name,
			price: businessOffers.price,
			originalValue: businessOffers.originalValue,
			isActive: businessOffers.isActive,
			isRecurring: businessOffers.isRecurring,
			quantity: businessOffers.quantity,
			pickupTimeFrom: businessOffers.pickupTimeFrom,
			pickupTimeUntil: businessOffers.pickupTimeUntil,
			businessAccountId: businessOffers.businessAccountId,
			businessName: businessProfiles.name,
			locationName: businessLocations.name
		})
		.from(businessOffers)
		.innerJoin(businessProfiles, eq(businessProfiles.accountId, businessOffers.businessAccountId))
		.leftJoin(businessLocations, eq(businessLocations.id, businessOffers.locationId))
		.where(eq(businessOffers.id, params.id))
		.limit(1);

	if (!offer) {
		throw error(404, 'Offer not found');
	}

	if (!offer.isActive) {
		throw redirect(303, `/offers/${params.id}`);
	}

	const [activeReservations, [wallet]] = await Promise.all([
		db
			.select({ id: reservations.id })
			.from(reservations)
			.where(and(eq(reservations.offerId, params.id), eq(reservations.status, 'active'))),
		db
			.select({
				ibanEnabled: businessWallets.ibanEnabled,
				tetherEnabled: businessWallets.tetherEnabled,
				preferredPaymentMethod: businessWallets.preferredPaymentMethod
			})
			.from(businessWallets)
			.where(eq(businessWallets.accountId, offer.businessAccountId))
			.limit(1)
	]);

	if (!wallet || (!wallet.ibanEnabled && !wallet.tetherEnabled)) {
		throw error(503, 'This business cannot accept payments yet. Please try again later.');
	}

	const requestedDate = url.searchParams.get('pickupDate');
	const pickupDate =
		requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
			? requestedDate
			: new Date().toISOString().slice(0, 10);

	const form = await superValidate(
		{ paymentMethod: wallet.preferredPaymentMethod, pickupDate },
		valibot(initPaymentSchema)
	);

	return {
		offer: {
			id: offer.id,
			name: offer.name,
			businessName: offer.businessName,
			locationName: offer.locationName,
			price: priceWithMargin(offer.price),
			originalValue: offer.originalValue,
			currency: wallet.ibanEnabled ? 'EUR' : 'IRR',
			isRecurring: offer.isRecurring
		},
		pickup: {
			from: pickupMoment(pickupDate, offer.pickupTimeFrom),
			until: pickupMoment(pickupDate, offer.pickupTimeUntil)
		},
		soldOut: activeReservations.length >= offer.quantity,
		businessPaymentMethods: {
			ibanEnabled: wallet.ibanEnabled,
			tetherEnabled: wallet.tetherEnabled
		},
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

		if (isNaN(new Date(pickupDateStr).getTime())) {
			return setError(form, 'pickupDate', 'Invalid pickup date');
		}

		const [offer] = await db
			.select()
			.from(businessOffers)
			.where(eq(businessOffers.id, params.id))
			.limit(1);

		if (!offer) {
			throw error(404, 'Offer not found');
		}

		if (!offer.isActive) {
			return setError(form, '', 'This offer is no longer available.');
		}

		// The reservation's pickup window starts at this moment, so it has to carry
		// the offer's pickup time rather than midnight of the chosen day.
		const pickupDate = pickupMoment(pickupDateStr, offer.pickupTimeFrom);
		if (pickupMoment(pickupDateStr, offer.pickupTimeUntil).getTime() <= Date.now()) {
			return setError(form, 'pickupDate', 'The pickup window for this day has already passed.');
		}

		// Check if already reserved
		const existingReservation = await db
			.select()
			.from(reservations)
			.where(and(eq(reservations.offerId, params.id), eq(reservations.status, 'active')))
			.limit(1);

		if (existingReservation.length >= offer.quantity) {
			return setError(form, '', 'Sorry, this offer has just sold out.');
		}

		// Verify business accepts this payment method
		const [wallet] = await db
			.select()
			.from(businessWallets)
			.where(eq(businessWallets.accountId, offer.businessAccountId))
			.limit(1);

		if (!wallet) {
			return setError(form, '', 'This business cannot accept payments yet.');
		}

		if (paymentMethod === 'iban' && !wallet.ibanEnabled) {
			return setError(form, 'paymentMethod', 'This business does not accept bank payments.');
		}

		if (paymentMethod === 'tether' && !wallet.tetherEnabled) {
			return setError(form, 'paymentMethod', 'This business does not accept USDT payments.');
		}

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
			return setError(form, '', paymentResult.error || 'We could not start the payment. Please try again.');
		}

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
