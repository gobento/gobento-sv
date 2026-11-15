// What a shared pickup invite shows in link previews. Only pending invites that
// have not expired get a card; anything else falls back to the default one.
import { and, eq, gt } from 'drizzle-orm';
import { db } from '#lib/server/db.js';
import {
	businessLocations,
	businessOffers,
	businessProfiles,
	reservationInvites,
	reservations
} from '#lib/server/schema.js';
import { formatDate, formatTimeOfDay } from '#lib/dates.js';
import type { InviteCard } from './inviteImage';

export async function inviteCard(token: string): Promise<InviteCard | null> {
	if (!/^[A-Za-z0-9_-]{8,128}$/.test(token)) return null;

	const [row] = await db
		.select({
			offerName: businessOffers.name,
			businessName: businessProfiles.name,
			address: businessLocations.address,
			city: businessLocations.city,
			pickupFrom: reservations.pickupFrom,
			pickupUntil: reservations.pickupUntil
		})
		.from(reservationInvites)
		.innerJoin(reservations, eq(reservations.id, reservationInvites.reservationId))
		.innerJoin(businessOffers, eq(businessOffers.id, reservations.offerId))
		.innerJoin(businessProfiles, eq(businessProfiles.accountId, businessOffers.businessAccountId))
		.leftJoin(businessLocations, eq(businessLocations.id, businessOffers.locationId))
		.where(
			and(
				eq(reservationInvites.inviteToken, token),
				eq(reservationInvites.status, 'pending'),
				gt(reservationInvites.expiresAt, new Date())
			)
		)
		.limit(1);
	if (!row) return null;

	return {
		offerName: row.offerName,
		businessName: row.businessName,
		place: row.address ? `${row.address}, ${row.city}` : null,
		pickup: `${formatDate(row.pickupFrom)}, ${formatTimeOfDay(row.pickupFrom)}–${formatTimeOfDay(row.pickupUntil)}`
	};
}
