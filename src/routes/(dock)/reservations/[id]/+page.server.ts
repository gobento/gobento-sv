// src/routes/(dock)/reservations/[id]/+page.server.ts
import { db } from '$lib/server/db';
import {
	reservations,
	businessOffers,
	businessLocations,
	businessProfiles,
	reservationInvites,
	reservationClaims,
	accounts,
	files
} from '$lib/server/schema';
import { alias } from 'drizzle-orm/pg-core';

import { eq, and, or } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { randomBytes } from 'crypto';
import { getSignedDownloadUrl } from '$lib/server/backblaze';
import { priceWithMargin } from '$lib/server/payments/currency';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const account = locals.account!;
	const inviteToken = url.searchParams.get('invite');

	if (account.accountType !== 'user') {
		throw error(403, 'Only users can access reservations');
	}

	const reservationId = params.id;
	const locationFiles = alias(files, 'locationFiles');

	// Fetch reservation with all related data
	const [reservation] = await db
		.select({
			reservation: reservations,
			offer: businessOffers,
			location: businessLocations,
			business: businessProfiles,
			businessAccount: accounts,
			claim: reservationClaims,
			businessLogoKey: files.key,
			locationImageKey: locationFiles.key
		})
		.from(reservations)
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.leftJoin(businessLocations, eq(businessOffers.locationId, businessLocations.id))
		.innerJoin(accounts, eq(businessOffers.businessAccountId, accounts.id))
		.innerJoin(businessProfiles, eq(accounts.id, businessProfiles.accountId))
		.leftJoin(reservationClaims, eq(reservations.id, reservationClaims.reservationId))
		.leftJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.leftJoin(locationFiles, eq(businessLocations.imageId, locationFiles.id))
		.where(eq(reservations.id, reservationId));

	if (!reservation) {
		error(404, 'Reservation not found');
	}

	// Check if user is the owner
	const isOwner = reservation.reservation.userAccountId === account.id;

	// Fetch all invites
	const invites = await db
		.select()
		.from(reservationInvites)
		.where(eq(reservationInvites.reservationId, reservationId));

	// Check if user has an accepted invite
	const userInvite = invites.find(
		(inv) => inv.invitedAccountId === account.id && inv.status === 'accepted'
	);

	// Handle invite token in URL - just load the invite, don't auto-accept
	let pendingInviteForUser = null;
	if (inviteToken && !isOwner) {
		const [foundInvite] = await db
			.select()
			.from(reservationInvites)
			.where(
				and(
					eq(reservationInvites.reservationId, reservationId),
					eq(reservationInvites.inviteToken, inviteToken)
				)
			);

		if (foundInvite) {
			// Check if invite hasn't expired
			if (new Date() <= new Date(foundInvite.expiresAt)) {
				if (foundInvite.status === 'pending') {
					// Show the user the invite to accept
					pendingInviteForUser = foundInvite;
				} else if (
					foundInvite.status === 'accepted' &&
					foundInvite.invitedAccountId === account.id
				) {
					// User already accepted this invite
					// Continue to show reservation normally
				} else if (
					foundInvite.status === 'accepted' &&
					foundInvite.invitedAccountId !== account.id
				) {
					// Someone else already accepted this invite
					error(403, 'This invite has already been accepted by another user');
				}
			} else {
				// Mark as expired
				await db
					.update(reservationInvites)
					.set({ status: 'expired' })
					.where(eq(reservationInvites.id, foundInvite.id));
				error(410, 'This invite has expired');
			}
		}
	}

	// Check if user has access
	if (!isOwner && !userInvite && !pendingInviteForUser) {
		error(403, 'You do not have access to this reservation');
	}

	// Check if expired
	const now = new Date();
	const isExpired = now > new Date(reservation.reservation.pickupUntil);

	if (isExpired && reservation.reservation.status === 'active') {
		await db
			.update(reservations)
			.set({ status: 'expired' })
			.where(eq(reservations.id, reservationId));

		reservation.reservation.status = 'expired';
	}

	let logoUrl = '';
	if (reservation.businessLogoKey) {
		logoUrl = await getSignedDownloadUrl(reservation.businessLogoKey!);
	}

	let imageUrl = '';
	if (reservation.locationImageKey) {
		imageUrl = await getSignedDownloadUrl(reservation.locationImageKey!);
	}

	return {
		reservation: reservation.reservation,
		offer: { ...reservation.offer, price: priceWithMargin(reservation.offer.price) },
		location: { ...reservation.location, imageUrl: imageUrl },
		business: {
			...reservation.business,
			logo: { url: logoUrl }
		},
		businessAccount: reservation.businessAccount,
		claim: reservation.claim,
		invites,
		isOwner,
		userInvite,
		pendingInviteForUser
	};
};

export const actions: Actions = {
	claimReservation: async ({ params, locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const reservationId = params.id;

		const [reservation] = await db
			.select()
			.from(reservations)
			.where(eq(reservations.id, reservationId));

		if (!reservation) {
			return fail(404, { error: 'Reservation not found' });
		}

		// Check if user owns this reservation OR has accepted invite
		const isOwner = reservation.userAccountId === session.accountId;

		let hasAccess = isOwner;
		if (!isOwner) {
			const [userInvite] = await db
				.select()
				.from(reservationInvites)
				.where(
					and(
						eq(reservationInvites.reservationId, reservationId),
						eq(reservationInvites.invitedAccountId, session.accountId),
						eq(reservationInvites.status, 'accepted')
					)
				);
			hasAccess = !!userInvite;
		}

		if (!hasAccess) {
			return fail(403, { error: 'You do not have access to this reservation' });
		}

		if (reservation.status === 'claimed') {
			return fail(400, { error: 'Reservation already claimed' });
		}

		if (reservation.status === 'expired') {
			return fail(400, { error: 'Reservation has expired' });
		}

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

	createInvite: async ({ params, locals, url }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const reservationId = params.id;

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
			return fail(400, { error: 'Cannot create invite for non-active reservations' });
		}

		// Check if there's already a pending or accepted invite
		const existingInvites = await db
			.select()
			.from(reservationInvites)
			.where(
				and(
					eq(reservationInvites.reservationId, reservationId),
					or(eq(reservationInvites.status, 'pending'), eq(reservationInvites.status, 'accepted'))
				)
			);

		if (existingInvites.length > 0) {
			return fail(400, { error: 'An invite already exists for this reservation' });
		}

		// Create invite with shareable link
		const inviteToken = randomBytes(32).toString('hex');
		const expiresAt = new Date(reservation.pickupUntil);

		const [newInvite] = await db
			.insert(reservationInvites)
			.values({
				id: crypto.randomUUID(),
				reservationId,
				invitedByAccountId: session.accountId,
				invitedAccountId: null, // Will be set when someone accepts
				inviteToken,
				status: 'pending',
				expiresAt
			})
			.returning();

		const origin = url.origin;
		const inviteLink = `${origin}/reservations/${reservationId}?invite=${inviteToken}`;

		return {
			success: true,
			message: 'Invite created successfully',
			inviteLink
		};
	},

	cancelInvite: async ({ params, locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const reservationId = params.id;

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

		// Delete all pending AND accepted invites (owner reclaims ability to collect)
		await db
			.delete(reservationInvites)
			.where(
				and(
					eq(reservationInvites.reservationId, reservationId),
					or(eq(reservationInvites.status, 'pending'), eq(reservationInvites.status, 'accepted'))
				)
			);

		return { success: true, message: 'Invite cancelled successfully' };
	},

	acceptInvite: async ({ params, locals, url }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const reservationId = params.id;
		const inviteToken = url.searchParams.get('invite');

		if (!inviteToken) {
			return fail(400, { error: 'Invite token is required' });
		}

		// Find the invite by token
		const [invite] = await db
			.select()
			.from(reservationInvites)
			.where(
				and(
					eq(reservationInvites.reservationId, reservationId),
					eq(reservationInvites.inviteToken, inviteToken),
					eq(reservationInvites.status, 'pending')
				)
			);

		if (!invite) {
			return fail(404, { error: 'Invite not found or already used' });
		}

		if (new Date() > new Date(invite.expiresAt)) {
			await db
				.update(reservationInvites)
				.set({ status: 'expired' })
				.where(eq(reservationInvites.id, invite.id));

			return fail(400, { error: 'Invite has expired' });
		}

		// Check if the user is the owner (can't accept your own invite)
		const [reservation] = await db
			.select()
			.from(reservations)
			.where(eq(reservations.id, reservationId));

		if (reservation?.userAccountId === session.accountId) {
			return fail(400, { error: 'You cannot accept your own invitation' });
		}

		// Accept the invite
		await db
			.update(reservationInvites)
			.set({
				status: 'accepted',
				invitedAccountId: session.accountId,
				acceptedAt: new Date()
			})
			.where(eq(reservationInvites.id, invite.id));

		return { success: true, message: 'Invite accepted successfully', inviteAccepted: true };
	},

	declineInvite: async ({ params, locals, url }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const reservationId = params.id;
		const inviteToken = url.searchParams.get('invite');

		if (!inviteToken) {
			return fail(400, { error: 'Invite token is required' });
		}

		// Find the invite by token
		const [invite] = await db
			.select()
			.from(reservationInvites)
			.where(
				and(
					eq(reservationInvites.reservationId, reservationId),
					eq(reservationInvites.inviteToken, inviteToken),
					eq(reservationInvites.status, 'pending')
				)
			);

		if (!invite) {
			return fail(404, { error: 'Invite not found' });
		}

		// Decline the invite
		await db
			.update(reservationInvites)
			.set({ status: 'declined' })
			.where(eq(reservationInvites.id, invite.id));

		return { success: true, message: 'Invite declined', inviteDeclined: true };
	}
};
