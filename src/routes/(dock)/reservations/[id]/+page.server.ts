// src/routes/reservations/[id]/+page.server.ts
import { db } from '$lib/server/db';
import {
	reservations,
	businessOffers,
	businessLocations,
	businessProfiles,
	reservationInvites,
	reservationClaims,
	accounts
} from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { randomBytes } from 'crypto';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = locals.session;

	const reservationId = params.id;

	// Fetch reservation with all related data
	const [reservation] = await db
		.select({
			reservation: reservations,
			offer: businessOffers,
			location: businessLocations,
			business: businessProfiles,
			businessAccount: accounts,
			claim: reservationClaims,
			claimedByAccount: accounts
		})
		.from(reservations)
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.leftJoin(businessLocations, eq(businessOffers.locationId, businessLocations.id))
		.innerJoin(accounts, eq(businessOffers.businessAccountId, accounts.id))
		.innerJoin(businessProfiles, eq(accounts.id, businessProfiles.accountId))
		.leftJoin(reservationClaims, eq(reservations.id, reservationClaims.reservationId))
		//	.leftJoin(accounts.as('claimedByAccount'), eq(reservations.claimedBy, accounts.id))
		.where(eq(reservations.id, reservationId));

	if (!reservation) {
		error(404, 'Reservation not found');
	}

	// Check if user has access (either owner or invited friend)
	const isOwner = reservation.reservation.userAccountId === session!.accountId;

	const invites = await db
		.select()
		.from(reservationInvites)
		.where(eq(reservationInvites.reservationId, reservationId));

	const userInvite = invites.find(
		(inv) => inv.invitedAccountId === session.accountId && inv.status === 'accepted'
	);

	if (!isOwner && !userInvite) {
		error(403, 'You do not have access to this reservation');
	}

	// Check if expired
	const now = new Date();
	const isExpired = now > new Date(reservation.reservation.pickupUntil);

	// Update status if expired
	if (isExpired && reservation.reservation.status === 'active') {
		await db
			.update(reservations)
			.set({ status: 'expired' })
			.where(eq(reservations.id, reservationId));

		reservation.reservation.status = 'expired';
	}

	return {
		reservation: reservation.reservation,
		offer: reservation.offer,
		location: reservation.location,
		business: reservation.business,
		businessAccount: reservation.businessAccount,
		claim: reservation.claim,
		claimedByAccount: reservation.claimedByAccount,
		invites,
		isOwner,
		userInvite
	};
};

export const actions: Actions = {
	claimReservation: async ({ params, locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const reservationId = params.id;

		// Fetch reservation
		const [reservation] = await db
			.select()
			.from(reservations)
			.where(eq(reservations.id, reservationId));

		if (!reservation) {
			return fail(404, { error: 'Reservation not found' });
		}

		// Check if user owns this reservation
		if (reservation.userAccountId !== session.accountId) {
			return fail(403, { error: 'You do not own this reservation' });
		}

		// Check if already claimed
		if (reservation.status === 'claimed') {
			return fail(400, { error: 'Reservation already claimed' });
		}

		// Check if expired
		if (reservation.status === 'expired') {
			return fail(400, { error: 'Reservation has expired' });
		}

		// Check if not active
		if (reservation.status !== 'active') {
			return fail(400, { error: 'Reservation is not active' });
		}

		// Update reservation to claimed
		await db
			.update(reservations)
			.set({
				status: 'claimed',
				claimedAt: new Date(),
				claimedBy: session.accountId
			})
			.where(eq(reservations.id, reservationId));

		return { success: true, message: 'Reservation claimed successfully' };
	},

	inviteFriend: async ({ request, params, locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const reservationId = params.id;
		const formData = await request.formData();
		const friendEmail = formData.get('friendEmail') as string;

		if (!friendEmail) {
			return fail(400, { error: 'Friend email is required' });
		}

		// Check if reservation exists and user owns it
		const [reservation] = await db
			.select()
			.from(reservations)
			.where(eq(reservations.id, reservationId));

		if (!reservation) {
			return fail(404, { error: 'Reservation not found' });
		}

		if (reservation.userAccountId !== session.accountId) {
			return fail(403, { error: 'You do not own this reservation' });
		}

		if (reservation.status !== 'active') {
			return fail(400, { error: 'Cannot invite friends to non-active reservations' });
		}

		// Check if friend exists
		const [friendAccount] = await db.select().from(accounts).where(eq(accounts.email, friendEmail));

		if (!friendAccount) {
			return fail(404, { error: 'Friend not found with that email' });
		}

		if (friendAccount.id === session.accountId) {
			return fail(400, { error: 'Cannot invite yourself' });
		}

		// Check if already invited
		const existingInvite = await db
			.select()
			.from(reservationInvites)
			.where(
				and(
					eq(reservationInvites.reservationId, reservationId),
					eq(reservationInvites.invitedAccountId, friendAccount.id)
				)
			);

		if (existingInvite.length > 0) {
			return fail(400, { error: 'Friend already invited' });
		}

		// Create invite
		const inviteToken = randomBytes(32).toString('hex');
		const expiresAt = new Date(reservation.pickupUntil);

		await db.insert(reservationInvites).values({
			id: crypto.randomUUID(),
			reservationId,
			invitedByAccountId: session.accountId,
			invitedAccountId: friendAccount.id,
			inviteToken,
			status: 'pending',
			expiresAt
		});

		return { success: true, message: 'Friend invited successfully' };
	},

	acceptInvite: async ({ params, locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const reservationId = params.id;

		// Find pending invite for this user
		const [invite] = await db
			.select()
			.from(reservationInvites)
			.where(
				and(
					eq(reservationInvites.reservationId, reservationId),
					eq(reservationInvites.invitedAccountId, session.accountId),
					eq(reservationInvites.status, 'pending')
				)
			);

		if (!invite) {
			return fail(404, { error: 'Invite not found' });
		}

		if (new Date() > new Date(invite.expiresAt)) {
			await db
				.update(reservationInvites)
				.set({ status: 'expired' })
				.where(eq(reservationInvites.id, invite.id));

			return fail(400, { error: 'Invite has expired' });
		}

		// Accept invite
		await db
			.update(reservationInvites)
			.set({
				status: 'accepted',
				acceptedAt: new Date()
			})
			.where(eq(reservationInvites.id, invite.id));

		return { success: true, message: 'Invite accepted' };
	},

	declineInvite: async ({ params, locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const reservationId = params.id;

		// Find pending invite for this user
		const [invite] = await db
			.select()
			.from(reservationInvites)
			.where(
				and(
					eq(reservationInvites.reservationId, reservationId),
					eq(reservationInvites.invitedAccountId, session.accountId),
					eq(reservationInvites.status, 'pending')
				)
			);

		if (!invite) {
			return fail(404, { error: 'Invite not found' });
		}

		// Decline invite
		await db
			.update(reservationInvites)
			.set({ status: 'declined' })
			.where(eq(reservationInvites.id, invite.id));

		return { success: true, message: 'Invite declined' };
	}
};
