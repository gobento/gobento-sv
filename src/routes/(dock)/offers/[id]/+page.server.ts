// src/routes/(dock)/offers/[id]/+page.server.ts
import { error, fail } from '@sveltejs/kit';
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
import { eq, and } from 'drizzle-orm';
import { getSignedDownloadUrl } from '$lib/server/backblaze';
import { PaymentHandler } from '$lib/server/payments/handler';
import { FEE_PERCENTAGE, TETHER_CONTRACT_ADDRESS } from '$env/static/private';
import { superValidate, setError } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { initPaymentSchema, txHashSchema } from './schema';

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

	const logoUrl = await getSignedDownloadUrl(logo.key);

	// Get location image URL if exists
	let locationImageUrl = null;
	if (location?.imageId) {
		const [locationImage] = await db
			.select()
			.from(files)
			.where(eq(files.id, location.imageId))
			.limit(1);

		if (locationImage) {
			locationImageUrl = await getSignedDownloadUrl(locationImage.key);
		}
	}

	return {
		offer: {
			...offer,
			displayPrice: offer.price,
			displayOriginalValue: offer.originalValue
		},
		location: location
			? {
					...location,
					imageUrl: locationImageUrl
				}
			: null,
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
		},
		feePercentage: parseFloat(FEE_PERCENTAGE),
		tetherContractAddress: TETHER_CONTRACT_ADDRESS
	};
};

export const actions: Actions = {
	/**
	 * Initialize payment - creates payment record and returns instructions
	 */
	initPayment: async ({ params, locals, request }) => {
		const account = locals.account!;

		if (account.accountType !== 'user') {
			throw error(403, 'Only user accounts can make payments');
		}

		// Validate form data with SuperForms
		const form = await superValidate(request, valibot(initPaymentSchema));

		console.log('=== INIT PAYMENT DEBUG ===');
		console.log('Form valid:', form.valid);
		console.log('Form data:', form.data);
		console.log('Form errors:', form.errors);

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

		const paymentResult = await PaymentHandler.initiatePayment({
			offerId: params.id,
			userAccountId: account.id,
			businessAccountId: offer.businessAccountId,
			amount: offer.price,
			currency,
			paymentMethod,
			pickupDate,
			metadata: {
				pickupDate: pickupDateStr,
				offerName: offer.name,
				email: account.email
			}
		});

		console.log('=== PAYMENT RESULT ===');
		console.log('Payment result:', paymentResult);

		if (!paymentResult.success) {
			return setError(form, '', paymentResult.error || 'Failed to initialize payment');
		}

		// Return payment details based on method
		if (paymentMethod === 'iban') {
			return {
				form,
				success: true,
				paymentId: paymentResult.paymentId,
				paymentMethod: 'iban',
				zarinpalAuthority: paymentResult.zarinpalAuthority,
				zarinpalPaymentUrl: paymentResult.zarinpalPaymentUrl,
				amount: offer.price,
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
	},

	/**
	 * Verify Tether payment - checks blockchain and completes payment
	 */
	verifyTetherPayment: async ({ params, locals, request }) => {
		const account = locals.account!;

		// IMPORTANT: Use txHashSchema here, NOT initPaymentSchema
		const form = await superValidate(request, valibot(txHashSchema));

		console.log('=== VERIFY TETHER PAYMENT DEBUG ===');
		console.log('Form valid:', form.valid);
		console.log('Form data:', form.data);
		console.log('Form errors:', form.errors);

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// Get both txHash and paymentId from validated form data
			const { txHash, paymentId } = form.data;

			console.log('Payment ID:', paymentId);
			console.log('TX Hash:', txHash);
			console.log('User Account ID:', account.id);

			// Find payment record
			const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);

			console.log('Payment found:', payment ? 'YES' : 'NO');
			if (payment) {
				console.log('Payment status:', payment.status);
				console.log('Payment user:', payment.userAccountId);
				console.log('Current user:', account.id);
			}

			if (!payment) {
				console.error('Payment not found for ID:', paymentId);
				return setError(form, '', 'Payment not found');
			}

			// Verify ownership
			if (payment.userAccountId !== account.id) {
				console.error('User mismatch');
				return setError(form, '', 'Payment does not belong to this user');
			}

			// Check status
			console.log('Checking payment status:', payment.status);

			if (payment.status === 'completed') {
				return setError(form, '', 'Payment already processed');
			}

			if (payment.status === 'failed') {
				return setError(form, '', 'Payment has failed. Please try again.');
			}

			if (payment.status !== 'pending' && payment.status !== 'processing') {
				console.error('Invalid status for verification:', payment.status);
				return setError(form, '', `Cannot verify payment in ${payment.status} status`);
			}

			// Complete payment
			console.log('Calling PaymentHandler.completePayment...');
			const completeResult = await PaymentHandler.completePayment({
				paymentId: payment.id,
				tetherTxHash: txHash
			});

			console.log('Complete result:', completeResult);

			if (!completeResult.success) {
				console.error('Payment completion failed:', completeResult.error);
				return setError(form, 'txHash', completeResult.error || 'Failed to verify payment');
			}

			return {
				form,
				success: true,
				reservationId: completeResult.reservationId
			};
		} catch (err) {
			console.error('=== VERIFY TETHER PAYMENT ERROR ===');
			console.error('Error:', err);
			console.error('Stack:', err instanceof Error ? err.stack : 'N/A');
			return setError(form, '', err instanceof Error ? err.message : 'Unknown error occurred');
		}
	}
};
