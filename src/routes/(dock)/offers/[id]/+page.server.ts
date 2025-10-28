// src/routes/(dock)/offers/[id]/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	businessOffers,
	businessLocations,
	businessProfiles,
	files,
	accounts,
	reservations,
	businessWallets,
	payments
} from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSignedDownloadUrl } from '$lib/server/backblaze';
import { PaymentHandler } from '$lib/server/payments/handler';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	// Fetch offer with location and business details
	const offerData = await db
		.select({
			offer: businessOffers,
			location: businessLocations,
			business: businessProfiles,
			businessAccount: accounts,
			logo: files
		})
		.from(businessOffers)
		.leftJoin(businessLocations, eq(businessOffers.locationId, businessLocations.id))
		.innerJoin(accounts, eq(businessOffers.businessAccountId, accounts.id))
		.innerJoin(businessProfiles, eq(accounts.id, businessProfiles.accountId))
		.innerJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.where(eq(businessOffers.id, params.id))
		.limit(1);

	if (!offerData.length) {
		throw error(404, 'Offer not found');
	}

	const { offer, location, business, businessAccount, logo } = offerData[0];

	// Get business payment preferences
	const [wallet] = await db
		.select()
		.from(businessWallets)
		.where(eq(businessWallets.accountId, offer.businessAccountId))
		.limit(1);

	if (!wallet || (!wallet.ibanEnabled && !wallet.tetherEnabled)) {
		throw error(500, 'Business has not configured payment methods');
	}

	// Check for existing active reservation
	let existingReservation = null;
	let userReservation = null;

	if (offer.isActive) {
		const activeReservations = await db
			.select()
			.from(reservations)
			.where(and(eq(reservations.offerId, offer.id), eq(reservations.status, 'active')))
			.limit(1);

		if (activeReservations.length > 0) {
			existingReservation = activeReservations[0];

			if (existingReservation.userAccountId === account.id) {
				userReservation = existingReservation;
			}
		}
	}

	const isOwner = account.id === offer.businessAccountId;
	const isUser = account.accountType === 'user';

	const logoUrl = await getSignedDownloadUrl(logo.key, 3600);

	return {
		offer: {
			...offer,
			displayPrice: offer.price,
			displayOriginalValue: offer.originalValue
		},
		location,
		business: {
			name: business.name,
			description: business.description,
			businessType: business.businessType,
			country: business.country
		},
		logo: {
			id: logo.id,
			url: logoUrl,
			fileName: logo.fileName
		},
		isOwner,
		isUser,
		accountType: account?.accountType || null,
		isReserved: !!existingReservation,
		userReservation: userReservation
			? {
					id: userReservation.id,
					reservedAt: userReservation.reservedAt,
					pickupFrom: userReservation.pickupFrom,
					pickupUntil: userReservation.pickupUntil,
					claimToken: userReservation.claimToken
				}
			: null,
		businessPaymentMethods: {
			ibanEnabled: wallet.ibanEnabled,
			tetherEnabled: wallet.tetherEnabled,
			preferredMethod: wallet.preferredPaymentMethod
		}
	};
};

export const actions: Actions = {
	/**
	 * Initialize payment
	 */
	initPayment: async ({ params, locals, request, url }) => {
		const account = locals.account!;

		if (account.accountType !== 'user') {
			throw error(403, 'Only user accounts can make payments');
		}

		const formData = await request.formData();
		const paymentMethod = formData.get('paymentMethod') as 'iban' | 'tether';
		const pickupDateStr = formData.get('pickupDate') as string;

		if (!paymentMethod || !pickupDateStr) {
			return fail(400, { error: 'Missing required fields' });
		}

		const pickupDate = new Date(pickupDateStr);
		if (isNaN(pickupDate.getTime())) {
			return fail(400, { error: 'Invalid pickup date' });
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
			return fail(400, { error: 'Offer is not active' });
		}

		// Check if already reserved
		const existingReservation = await db
			.select()
			.from(reservations)
			.where(and(eq(reservations.offerId, params.id), eq(reservations.status, 'active')))
			.limit(1);

		if (existingReservation.length > 0) {
			return fail(400, { error: 'Offer is already reserved' });
		}

		// Verify business accepts this payment method
		const [wallet] = await db
			.select()
			.from(businessWallets)
			.where(eq(businessWallets.accountId, offer.businessAccountId))
			.limit(1);

		if (!wallet) {
			return fail(500, { error: 'Business payment configuration not found' });
		}

		if (paymentMethod === 'iban' && !wallet.ibanEnabled) {
			return fail(400, { error: 'Business does not accept IBAN payments' });
		}

		if (paymentMethod === 'tether' && !wallet.tetherEnabled) {
			return fail(400, { error: 'Business does not accept USDT payments' });
		}

		// Create payment record
		const currency = paymentMethod === 'tether' ? 'USDT' : 'EUR';

		const paymentResult = await PaymentHandler.createPayment({
			offerId: params.id,
			userAccountId: account.id,
			businessAccountId: offer.businessAccountId,
			amount: offer.price,
			currency,
			paymentMethod,
			pickupDate,
			metadata: {
				pickupDate: pickupDateStr,
				offerName: offer.name
			}
		});

		if (!paymentResult.success || !paymentResult.paymentId) {
			return fail(500, { error: paymentResult.error || 'Failed to create payment' });
		}

		// Return payment details based on method
		if (paymentMethod === 'iban') {
			return {
				success: true,
				paymentId: paymentResult.paymentId,
				paymentMethod: 'iban',
				ibanNumber: wallet.ibanNumber,
				amount: offer.price,
				currency: 'EUR',
				reference: `PAY-${paymentResult.paymentId.substring(0, 8).toUpperCase()}`,
				pickupDate: pickupDateStr,
				offerName: offer.name
			};
		} else if (paymentMethod === 'tether') {
			return {
				success: true,
				paymentId: paymentResult.paymentId,
				paymentMethod: 'tether',
				tetherAddress: wallet.tetherAddress,
				amount: offer.price,
				currency: 'USDT',
				pickupDate: pickupDateStr,
				offerName: offer.name
			};
		}

		return fail(400, { error: 'Invalid payment method' });
	},

	/**
	 * Confirm payment (manual verification by user)
	 */
	confirmPayment: async ({ params, locals, request }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const paymentId = formData.get('paymentId') as string;
		const transactionReference = formData.get('transactionReference') as string;

		if (!paymentId) {
			return fail(400, { error: 'Payment ID is required' });
		}

		// Find payment record
		const [payment] = await db
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.id, paymentId),
					eq(payments.userAccountId, account.id),
					eq(payments.status, 'pending')
				)
			)
			.limit(1);

		if (!payment) {
			return fail(400, { error: 'Payment not found' });
		}

		// Update payment with reference
		const completeResult = await PaymentHandler.completePayment({
			paymentId: payment.id,
			ibanReference: payment.paymentMethod === 'iban' ? transactionReference : undefined,
			tetherTxHash: payment.paymentMethod === 'tether' ? transactionReference : undefined
		});

		if (!completeResult.success) {
			return fail(500, { error: completeResult.error || 'Failed to complete payment' });
		}

		return {
			success: true,
			reservationId: completeResult.reservationId
		};
	}
};
