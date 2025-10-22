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
	reservations
} from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = locals.session;
	const account = locals.account;

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

			// Check if the current user made this reservation
			if (account && existingReservation.userAccountId === account.id) {
				userReservation = existingReservation;
			}
		}
	}

	// Check if current user owns this offer
	const isOwner = account && account.id === offer.businessAccountId;
	const isUser = account && account.accountType === 'user';
	const isLoggedIn = !!session && !!account;

	return {
		offer,
		location,
		business: {
			name: business.name,
			description: business.description
		},
		logo: {
			id: logo.id,
			key: logo.key,
			fileName: logo.fileName
		},
		isOwner,
		isUser,
		isLoggedIn,
		accountType: account?.accountType || null,
		isReserved: !!existingReservation,
		userReservation: userReservation
			? {
					id: userReservation.id,
					reservedAt: userReservation.reservedAt
				}
			: null
	};
};

export const actions: Actions = {
	reserve: async ({ params, locals }) => {
		const session = locals.session;
		const account = locals.account;

		if (!session || !account) {
			throw error(401, 'Unauthorized');
		}

		if (account.accountType !== 'user') {
			throw error(403, 'Only user accounts can reserve offers');
		}

		// Check if offer exists and is active
		const offerResult = await db
			.select()
			.from(businessOffers)
			.where(eq(businessOffers.id, params.id))
			.limit(1);

		if (!offerResult.length) {
			throw error(404, 'Offer not found');
		}

		const offer = offerResult[0];

		if (!offer.isActive) {
			return fail(400, { error: 'This offer is not active' });
		}

		// Check if offer is already reserved
		const existingReservation = await db
			.select()
			.from(reservations)
			.where(and(eq(reservations.offerId, params.id), eq(reservations.status, 'active')))
			.limit(1);

		if (existingReservation.length > 0) {
			return fail(400, { error: 'This offer is already reserved by another user' });
		}

		// Create reservation
		await db.insert(reservations).values({
			id: crypto.randomUUID(),
			offerId: params.id,
			userAccountId: account.id,
			status: 'active'
		});

		return { success: true };
	},

	cancel: async ({ params, locals }) => {
		const session = locals.session;
		const account = locals.account;

		if (!session || !account) {
			throw error(401, 'Unauthorized');
		}

		// Find user's active reservation
		const reservationResult = await db
			.select()
			.from(reservations)
			.where(
				and(
					eq(reservations.offerId, params.id),
					eq(reservations.userAccountId, account.id),
					eq(reservations.status, 'active')
				)
			)
			.limit(1);

		if (!reservationResult.length) {
			return fail(400, { error: 'No active reservation found' });
		}

		// Update reservation status
		await db
			.update(reservations)
			.set({
				status: 'cancelled',
				cancelledAt: new Date()
			})
			.where(eq(reservations.id, reservationResult[0].id));

		return { success: true };
	}
};
