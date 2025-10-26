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
import { ZarinpalService } from '$lib/server/payments/zarinpal';
import { TetherService } from '$lib/server/payments/tether';
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

	const result = {
		offer,
		location,
		business: {
			name: business.name,
			description: business.description
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
			: null
	};

	console.log('Offer loaded:', result);
	return result;
};

export const actions: Actions = {
	/**
	 * Initialize payment (creates payment record and redirects/returns address)
	 */
	initPayment: async ({ params, locals, request, url }) => {
		const account = locals.account!;

		if (account.accountType !== 'user') {
			throw error(403, 'Only user accounts can make payments');
		}

		// Get form data
		const formData = await request.formData();
		const paymentMethod = formData.get('paymentMethod') as 'zarinpal' | 'tether';
		const pickupDateStr = formData.get('pickupDate') as string;

		if (!paymentMethod || !pickupDateStr) {
			return fail(400, { error: 'Missing required fields' });
		}

		// Validate pickup date
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

		// Create payment record
		const paymentResult = await PaymentHandler.createPayment({
			offerId: params.id,
			userAccountId: account.id,
			businessAccountId: offer.businessAccountId,
			amount: offer.price,
			currency: offer.currency === 'EUR' ? 'USDT' : (offer.currency as 'IRR' | 'USDT'),
			paymentMethod,
			pickupDate,
			metadata: { pickupDate: pickupDateStr }
		});

		if (!paymentResult.success || !paymentResult.paymentId) {
			return fail(500, { error: paymentResult.error || 'Failed to create payment' });
		}

		// Handle based on payment method
		if (paymentMethod === 'zarinpal') {
			// Request Zarinpal payment
			const callbackUrl = `${env.PUBLIC_APP_URL}/payments/callback?paymentId=${paymentResult.paymentId}`;

			const zarinpalResult = await ZarinpalService.requestPayment({
				amount: offer.price,
				description: `Payment for ${offer.name}`,
				email: account.email,
				callbackUrl,
				metadata: {
					paymentId: paymentResult.paymentId,
					offerId: params.id
				}
			});

			if (!zarinpalResult.success || !zarinpalResult.paymentUrl) {
				await PaymentHandler.failPayment(
					paymentResult.paymentId,
					zarinpalResult.error || 'Failed to initialize Zarinpal payment'
				);
				return fail(500, { error: zarinpalResult.error || 'Payment initialization failed' });
			}

			// Redirect to Zarinpal
			throw redirect(303, zarinpalResult.paymentUrl);
		} else if (paymentMethod === 'tether') {
			// Get business wallet
			const [wallet] = await db
				.select()
				.from(businessWallets)
				.where(eq(businessWallets.accountId, offer.businessAccountId))
				.limit(1);

			if (!wallet || !wallet.tetherAddress || !wallet.tetherEnabled) {
				await PaymentHandler.failPayment(
					paymentResult.paymentId,
					'Business does not accept Tether'
				);
				return fail(400, { error: 'Business does not accept Tether payments' });
			}

			// Return wallet address for user to send payment
			return {
				success: true,
				paymentId: paymentResult.paymentId,
				tetherAddress: wallet.tetherAddress,
				amount: offer.price
			};
		}

		return fail(400, { error: 'Invalid payment method' });
	},

	/**
	 * Verify Tether transaction
	 */
	verifyTether: async ({ params, locals, request }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const txHash = formData.get('txHash') as string;
		const tetherAddress = formData.get('tetherAddress') as string;
		const pickupDateStr = formData.get('pickupDate') as string;

		if (!txHash || !tetherAddress) {
			return fail(400, { error: 'Transaction hash is required' });
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

		// Find payment record
		const [payment] = await db
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.offerId, params.id),
					eq(payments.userAccountId, account.id),
					eq(payments.status, 'pending')
				)
			)
			.orderBy(desc(payments.createdAt))
			.limit(1);

		if (!payment) {
			return fail(400, { error: 'Payment not found' });
		}

		// Verify transaction on blockchain
		const tetherService = new TetherService();
		const verifyResult = await tetherService.verifyPayment({
			txHash,
			expectedAmount: offer.price,
			recipientAddress: tetherAddress
		});

		if (!verifyResult.success) {
			return fail(400, { error: verifyResult.error || 'Transaction verification failed' });
		}

		// Complete payment and create reservation
		const completeResult = await PaymentHandler.completePayment({
			paymentId: payment.id,
			tetherTxHash: txHash,
			tetherFromAddress: verifyResult.from
		});

		if (!completeResult.success) {
			return fail(500, { error: completeResult.error || 'Failed to complete payment' });
		}

		// Redirect to reservation
		throw redirect(303, `/reservations/${completeResult.reservationId}`);
	}
};
