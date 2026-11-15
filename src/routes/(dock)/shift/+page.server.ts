// src/routes/(dock)/shift/+page.server.ts
/**
 * The staff view. Business staff see their one location: what to pack, the
 * orders for today and tomorrow, and a scanner to hand orders over. Charity
 * staff see the pickups they have to collect and the codes to show.
 */
import type { PageServerLoad, Actions } from './$types';
import { db } from '#lib/server/db.js';
import {
	reservations,
	businessOffers,
	businessLocations,
	businessProfiles,
	charityProfiles,
	pickupRequests
} from '#lib/server/schema.js';
import { and, eq, gte, lte, inArray, asc, isNull } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { locationFor, redeemPickup, staffContext } from '#lib/server/staff.js';
import { materializeDueGifts } from '#lib/server/recurringGifts.js';

const HOUR = 60 * 60 * 1000;

async function requireStaff(locals: App.Locals) {
	const staff = await staffContext(locals.account!);
	if (!staff) throw error(403, 'This page is for staff of a business or charity');
	return staff;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const staff = await requireStaff(locals);
	const now = new Date();
	// Enough to cover "today" and "tomorrow" in any time zone; the page groups by local day.
	const windowStart = new Date(now.getTime() - 14 * HOUR);
	const windowEnd = new Date(now.getTime() + 62 * HOUR);

	if (staff.employerType === 'charity') {
		await materializeDueGifts({ charityAccountId: staff.employerAccountId });
		const [charity] = await db
			.select({ name: charityProfiles.name })
			.from(charityProfiles)
			.where(eq(charityProfiles.accountId, staff.employerAccountId))
			.limit(1);

		const pickups = await db
			.select({
				id: pickupRequests.id,
				message: pickupRequests.message,
				foodType: pickupRequests.foodType,
				from: pickupRequests.proposedPickupFrom,
				until: pickupRequests.proposedPickupUntil,
				recurring: pickupRequests.recurringGiftId,
				businessName: businessProfiles.name,
				locationName: businessLocations.name,
				address: businessLocations.address,
				city: businessLocations.city,
				latitude: businessLocations.latitude,
				longitude: businessLocations.longitude,
				reservationId: reservations.id,
				reservationStatus: reservations.status,
				// Lets the collector's phone sign live pickup codes, also offline.
				claimToken: reservations.claimToken
			})
			.from(pickupRequests)
			.innerJoin(businessProfiles, eq(pickupRequests.businessAccountId, businessProfiles.accountId))
			.leftJoin(businessLocations, eq(pickupRequests.locationId, businessLocations.id))
			.leftJoin(reservations, eq(pickupRequests.reservationId, reservations.id))
			.where(
				and(
					eq(pickupRequests.charityAccountId, staff.employerAccountId),
					eq(pickupRequests.status, 'accepted'),
					gte(pickupRequests.proposedPickupUntil, new Date(now.getTime() - 6 * HOUR)),
					lte(pickupRequests.proposedPickupFrom, new Date(now.getTime() + 7 * 24 * HOUR))
				)
			)
			.orderBy(asc(pickupRequests.proposedPickupFrom));

		return {
			mode: 'charity' as const,
			staffName: staff.name,
			isOwner: staff.isOwner,
			organisation: charity?.name ?? 'Your charity',
			pickups,
			serverNow: now.getTime()
		};
	}

	const { location, locations } = await locationFor(staff, url.searchParams.get('location'));
	if (!location) {
		throw error(404, staff.isOwner ? 'Add a location first' : 'Your location no longer exists');
	}

	const orders = await db
		.select({
			id: reservations.id,
			status: reservations.status,
			pickupFrom: reservations.pickupFrom,
			pickupUntil: reservations.pickupUntil,
			claimedAt: reservations.claimedAt,
			offerId: businessOffers.id,
			offerName: businessOffers.name,
			offerDescription: businessOffers.description,
			charityName: charityProfiles.name
		})
		.from(reservations)
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.leftJoin(charityProfiles, eq(reservations.userAccountId, charityProfiles.accountId))
		.where(
			and(
				eq(businessOffers.locationId, location.id),
				eq(businessOffers.businessAccountId, staff.employerAccountId),
				inArray(reservations.status, ['active', 'claimed', 'completed']),
				gte(reservations.pickupFrom, windowStart),
				lte(reservations.pickupFrom, windowEnd)
			)
		)
		.orderBy(asc(reservations.pickupFrom));

	await materializeDueGifts({ businessAccountId: staff.employerAccountId });
	const charityPickups = await db
		.select({
			id: pickupRequests.id,
			status: pickupRequests.status,
			message: pickupRequests.message,
			foodType: pickupRequests.foodType,
			from: pickupRequests.proposedPickupFrom,
			until: pickupRequests.proposedPickupUntil,
			recurring: pickupRequests.recurringGiftId,
			charityName: charityProfiles.name
		})
		.from(pickupRequests)
		.innerJoin(charityProfiles, eq(pickupRequests.charityAccountId, charityProfiles.accountId))
		.where(
			and(
				eq(pickupRequests.locationId, location.id),
				eq(pickupRequests.businessAccountId, staff.employerAccountId),
				inArray(pickupRequests.status, ['accepted', 'completed']),
				// Only gifts without an order; orders already show up above.
				isNull(pickupRequests.reservationId),
				gte(pickupRequests.proposedPickupFrom, windowStart),
				lte(pickupRequests.proposedPickupFrom, windowEnd)
			)
		)
		.orderBy(asc(pickupRequests.proposedPickupFrom));

	return {
		mode: 'business' as const,
		staffName: staff.name,
		isOwner: staff.isOwner,
		location,
		locations,
		// Never send claim tokens to the counter: staff verify codes, they don't make them.
		orders: orders.map((o) => ({ ...o, ref: o.id.slice(-4).toUpperCase() })),
		charityPickups,
		serverNow: now.getTime()
	};
};

export const actions: Actions = {
	redeem: async ({ request, locals, url }) => {
		const staff = await requireStaff(locals);
		if (staff.employerType !== 'business') return fail(403, { redeem: { error: 'Not allowed' } });
		const { location } = await locationFor(staff, url.searchParams.get('location'));
		if (!location) return fail(404, { redeem: { error: 'Location not found' } });

		const formData = await request.formData();
		const payload = formData.get('code');
		const reservationId = formData.get('reservationId');
		const digits = formData.get('digits');

		const result =
			typeof payload === 'string' && payload
				? await redeemPickup(staff, location.id, { kind: 'qr', payload })
				: typeof reservationId === 'string' && typeof digits === 'string'
					? await redeemPickup(staff, location.id, { kind: 'digits', reservationId, digits })
					: ({ ok: false, error: 'Scan a code or enter the 6 digits' } as const);

		if (!result.ok) return fail(400, { redeem: { error: result.error } });
		return { redeem: { success: true, offerName: result.offerName, collector: result.collector } };
	},

	handOver: async ({ request, locals, url }) => {
		const staff = await requireStaff(locals);
		if (staff.employerType !== 'business') return fail(403, { action: { error: 'Not allowed' } });
		const { location } = await locationFor(staff, url.searchParams.get('location'));
		const id = (await request.formData()).get('pickupId');
		if (!location || typeof id !== 'string')
			return fail(400, { action: { error: 'Pickup not found' } });

		const updated = await db
			.update(pickupRequests)
			.set({ status: 'completed' })
			.where(
				and(
					eq(pickupRequests.id, id),
					eq(pickupRequests.locationId, location.id),
					eq(pickupRequests.businessAccountId, staff.employerAccountId),
					eq(pickupRequests.status, 'accepted')
				)
			)
			.returning({ id: pickupRequests.id });
		if (updated.length === 0) return fail(400, { action: { error: 'Pickup not found' } });
		return { action: { success: true } };
	},

	markCollected: async ({ request, locals }) => {
		const staff = await requireStaff(locals);
		if (staff.employerType !== 'charity') return fail(403, { action: { error: 'Not allowed' } });
		const id = (await request.formData()).get('pickupId');
		if (typeof id !== 'string') return fail(400, { action: { error: 'Pickup not found' } });

		const updated = await db
			.update(pickupRequests)
			.set({ status: 'completed' })
			.where(
				and(
					eq(pickupRequests.id, id),
					eq(pickupRequests.charityAccountId, staff.employerAccountId),
					eq(pickupRequests.status, 'accepted')
				)
			)
			.returning({ id: pickupRequests.id });
		if (updated.length === 0) return fail(400, { action: { error: 'Pickup not found' } });
		return { action: { success: true } };
	}
};
