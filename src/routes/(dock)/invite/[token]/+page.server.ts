// src/routes/(dock)/invite/[token]/+page.server.ts
/**
 * Where an invite link lands when it can't be used: explains why (taken by
 * someone else, cancelled, expired, already collected) instead of a bare
 * access error. Usable links are sent on to the reservation.
 */
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db.js';
import {
	reservationInvites,
	reservations,
	businessOffers,
	businessProfiles
} from '#lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export type InviteProblem = 'taken' | 'revoked' | 'expired' | 'declined' | 'collected';

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	const [row] = await db
		.select({
			status: reservationInvites.status,
			expiresAt: reservationInvites.expiresAt,
			invitedAccountId: reservationInvites.invitedAccountId,
			reservationId: reservations.id,
			ownerAccountId: reservations.userAccountId,
			reservationStatus: reservations.status,
			pickupFrom: reservations.pickupFrom,
			pickupUntil: reservations.pickupUntil,
			offerName: businessOffers.name,
			businessName: businessProfiles.name
		})
		.from(reservationInvites)
		.innerJoin(reservations, eq(reservationInvites.reservationId, reservations.id))
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.innerJoin(businessProfiles, eq(businessOffers.businessAccountId, businessProfiles.accountId))
		.where(eq(reservationInvites.inviteToken, params.token))
		.limit(1);

	// Cancelled by the sender (cancelling deletes the link) or never existed.
	if (!row) return { problem: 'revoked' as InviteProblem, details: null };

	const reservationUrl = `/reservations/${row.reservationId}`;
	const withToken = `${reservationUrl}?invite=${encodeURIComponent(params.token)}`;

	// The sender can always open their own link (and take the bag back there).
	if (row.ownerAccountId === account.id) redirect(303, withToken);
	// Whoever accepted it keeps access through the same link.
	if (row.status === 'accepted' && row.invitedAccountId === account.id)
		redirect(303, reservationUrl);

	const details = {
		offerName: row.offerName,
		businessName: row.businessName,
		pickupFrom: row.pickupFrom,
		pickupUntil: row.pickupUntil
	};

	let problem: InviteProblem;
	if (row.reservationStatus === 'claimed' || row.reservationStatus === 'completed') {
		problem = 'collected';
	} else if (row.status === 'accepted') {
		problem = 'taken';
	} else if (row.status === 'declined') {
		problem = 'declined';
	} else if (
		row.status === 'expired' ||
		row.reservationStatus === 'expired' ||
		new Date() > row.expiresAt
	) {
		problem = 'expired';
	} else {
		// Still pending and valid: show the invite.
		redirect(303, withToken);
	}

	return { problem, details };
};
