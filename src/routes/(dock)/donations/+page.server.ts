// src/routes/(dock)/donations/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { db } from '#lib/server/db.js';
import {
	pickupRequests,
	businessProfiles,
	businessLocations,
	businessOffers,
	reservations,
	recurringGifts,
	files
} from '#lib/server/schema.js';
import { eq, and, desc, sql, inArray, gt } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { getSignedDownloadUrl } from '#lib/server/backblaze.js';
import { notifyAccount } from '#lib/server/notifications.js';
import { randomUUID } from 'crypto';
import { PUBLIC_APP_URL } from '$app/env/private';
import { describeSchedule } from '#lib/recurringGifts.js';
import { firstOccurrenceFrom, materializeDueGifts } from '#lib/server/recurringGifts.js';

const appUrl = (path: string) => `${PUBLIC_APP_URL || 'http://localhost:5173'}${path}`;

/** One of this charity's gifts, or null. */
async function ownGift(charityAccountId: string, giftId: FormDataEntryValue | null) {
	if (typeof giftId !== 'string' || !giftId) return null;
	const [gift] = await db
		.select()
		.from(recurringGifts)
		.where(
			and(eq(recurringGifts.id, giftId), eq(recurringGifts.charityAccountId, charityAccountId))
		)
		.limit(1);
	return gift ?? null;
}

/** One of this charity's pickup requests, or null. */
async function ownPickup(charityAccountId: string, requestId: FormDataEntryValue | null) {
	if (typeof requestId !== 'string' || !requestId) return null;
	const [pickup] = await db
		.select()
		.from(pickupRequests)
		.where(
			and(eq(pickupRequests.id, requestId), eq(pickupRequests.charityAccountId, charityAccountId))
		)
		.limit(1);
	return pickup ?? null;
}

function generateClaimToken(): string {
	return `CLAIM-${randomUUID()}`;
}

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'charity') {
		throw error(403, 'Only charity accounts can access donations');
	}

	await materializeDueGifts({ charityAccountId: account.id });

	const rows = await db
		.select({
			id: pickupRequests.id,
			status: pickupRequests.status,
			message: pickupRequests.message,
			foodType: pickupRequests.foodType,
			proposedPickupFrom: pickupRequests.proposedPickupFrom,
			proposedPickupUntil: pickupRequests.proposedPickupUntil,
			createdAt: pickupRequests.createdAt,
			respondedAt: pickupRequests.respondedAt,
			notes: pickupRequests.notes,
			recurringGiftId: pickupRequests.recurringGiftId,
			businessName: businessProfiles.name,
			logoKey: files.key,
			locationName: businessLocations.name,
			locationCity: businessLocations.city,
			locationAddress: businessLocations.address,
			offerId: businessOffers.id,
			offerName: businessOffers.name,
			reservationId: reservations.id,
			reservationStatus: reservations.status,
			reservationClaimToken: reservations.claimToken,
			reservationPickupFrom: reservations.pickupFrom,
			reservationPickupUntil: reservations.pickupUntil
		})
		.from(pickupRequests)
		.innerJoin(businessProfiles, eq(pickupRequests.businessAccountId, businessProfiles.accountId))
		.innerJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.leftJoin(businessLocations, eq(pickupRequests.locationId, businessLocations.id))
		.leftJoin(businessOffers, eq(pickupRequests.offerId, businessOffers.id))
		.leftJoin(reservations, eq(pickupRequests.reservationId, reservations.id))
		.where(eq(pickupRequests.charityAccountId, account.id))
		.orderBy(desc(pickupRequests.createdAt));

	const requests = await Promise.all(
		rows.map(async (row) => ({
			...row,
			logoUrl: await getSignedDownloadUrl(row.logoKey)
		}))
	);

	const giftRows = await db
		.select({
			id: recurringGifts.id,
			status: recurringGifts.status,
			message: recurringGifts.message,
			foodType: recurringGifts.foodType,
			frequency: recurringGifts.frequency,
			weekday: recurringGifts.weekday,
			dayOfMonth: recurringGifts.dayOfMonth,
			pickupTimeFrom: recurringGifts.pickupTimeFrom,
			pickupTimeUntil: recurringGifts.pickupTimeUntil,
			startsOn: recurringGifts.startsOn,
			nextOccurrenceAt: recurringGifts.nextOccurrenceAt,
			createdAt: recurringGifts.createdAt,
			businessName: businessProfiles.name,
			logoKey: files.key,
			locationName: businessLocations.name,
			locationCity: businessLocations.city,
			locationAddress: businessLocations.address
		})
		.from(recurringGifts)
		.innerJoin(businessProfiles, eq(recurringGifts.businessAccountId, businessProfiles.accountId))
		.innerJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.leftJoin(businessLocations, eq(recurringGifts.locationId, businessLocations.id))
		.where(
			and(
				eq(recurringGifts.charityAccountId, account.id),
				inArray(recurringGifts.status, ['proposed', 'active', 'paused'])
			)
		)
		.orderBy(desc(recurringGifts.createdAt));

	const gifts = await Promise.all(
		giftRows.map(async ({ logoKey, ...gift }) => ({
			...gift,
			logoUrl: await getSignedDownloadUrl(logoKey),
			schedule: describeSchedule({
				frequency: gift.frequency,
				weekday: gift.weekday,
				dayOfMonth: gift.dayOfMonth,
				timeFrom: gift.pickupTimeFrom,
				timeUntil: gift.pickupTimeUntil
			})
		}))
	);

	const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const stats = {
		collected: requests.filter((r) => r.status === 'completed').length,
		collectedThisMonth: requests.filter(
			(r) => r.status === 'completed' && r.proposedPickupFrom && r.proposedPickupFrom >= monthAgo
		).length,
		regularDonors: new Set(gifts.filter((g) => g.status === 'active').map((g) => g.businessName))
			.size,
		businesses: new Set(
			requests
				.filter((r) => r.status === 'accepted' || r.status === 'completed')
				.map((r) => r.businessName)
		).size
	};

	return { requests, gifts, stats, serverNow: Date.now() };
};

export const actions: Actions = {
	acceptGift: async ({ request, locals }) => {
		const account = locals.account!;
		if (account.accountType !== 'charity') return fail(403, { action: { error: 'Not allowed' } });
		const gift = await ownGift(account.id, (await request.formData()).get('giftId'));
		if (!gift) return fail(404, { action: { error: 'Regular gift not found' } });
		if (gift.status !== 'proposed') {
			return fail(400, { action: { error: 'This gift has already been answered' } });
		}
		await db
			.update(recurringGifts)
			.set({
				status: 'active',
				respondedAt: new Date(),
				nextOccurrenceAt: firstOccurrenceFrom(gift)
			})
			.where(eq(recurringGifts.id, gift.id));
		await materializeDueGifts({ charityAccountId: account.id });

		await notifyAccount(gift.businessAccountId, {
			title: 'Regular gift accepted',
			message: 'A charity accepted your regular food gift. Pickups are now booked automatically.',
			tags: ['white_check_mark', 'repeat'],
			priority: 'high',
			click: appUrl('/charities')
		}).catch((err) => console.error('Failed to notify business about a gift:', err));
		return { action: { success: true } };
	},

	declineGift: async ({ request, locals }) => {
		const account = locals.account!;
		if (account.accountType !== 'charity') return fail(403, { action: { error: 'Not allowed' } });
		const formData = await request.formData();
		const gift = await ownGift(account.id, formData.get('giftId'));
		if (!gift) return fail(404, { action: { error: 'Regular gift not found' } });
		if (gift.status !== 'proposed') {
			return fail(400, { action: { error: 'This gift has already been answered' } });
		}
		const notes = (formData.get('notes') as string | null)?.trim() || null;
		await db
			.update(recurringGifts)
			.set({ status: 'declined', respondedAt: new Date(), notes })
			.where(eq(recurringGifts.id, gift.id));

		await notifyAccount(gift.businessAccountId, {
			title: 'Regular gift declined',
			message: 'A charity declined your regular food gift.',
			tags: ['x'],
			priority: 'default',
			click: appUrl('/charities')
		}).catch((err) => console.error('Failed to notify business about a gift:', err));
		return { action: { success: true } };
	},

	stopGift: async ({ request, locals }) => {
		const account = locals.account!;
		if (account.accountType !== 'charity') return fail(403, { action: { error: 'Not allowed' } });
		const gift = await ownGift(account.id, (await request.formData()).get('giftId'));
		if (!gift) return fail(404, { action: { error: 'Regular gift not found' } });
		if (gift.status !== 'active' && gift.status !== 'paused') {
			return fail(400, { action: { error: 'This gift is not running' } });
		}
		const now = new Date();
		await db
			.update(recurringGifts)
			.set({ status: 'ended', nextOccurrenceAt: null, endedAt: now })
			.where(eq(recurringGifts.id, gift.id));
		await db
			.update(pickupRequests)
			.set({ status: 'cancelled' })
			.where(
				and(
					eq(pickupRequests.recurringGiftId, gift.id),
					eq(pickupRequests.status, 'accepted'),
					gt(pickupRequests.proposedPickupFrom, now)
				)
			);

		await notifyAccount(gift.businessAccountId, {
			title: 'Regular gift stopped',
			message: 'A charity stopped collecting your regular food gift.',
			tags: ['x'],
			priority: 'default',
			click: appUrl('/charities')
		}).catch((err) => console.error('Failed to notify business about a gift:', err));
		return { action: { success: true } };
	},

	skipPickup: async ({ request, locals }) => {
		const account = locals.account!;
		if (account.accountType !== 'charity') return fail(403, { action: { error: 'Not allowed' } });
		const pickup = await ownPickup(account.id, (await request.formData()).get('requestId'));
		if (!pickup) return fail(404, { action: { error: 'Pickup not found' } });
		if (pickup.status !== 'accepted') {
			return fail(400, { action: { error: 'Only a scheduled pickup can be called off' } });
		}
		await db
			.update(pickupRequests)
			.set({ status: 'cancelled', notes: 'Called off by the charity' })
			.where(eq(pickupRequests.id, pickup.id));

		await notifyAccount(pickup.businessAccountId, {
			title: 'Pickup called off',
			message: "A charity can't make one of its scheduled pickups.",
			tags: ['calendar'],
			priority: 'high',
			click: appUrl('/dashboard')
		}).catch((err) => console.error('Failed to notify business about a pickup:', err));
		return { action: { success: true } };
	},

	markCollected: async ({ request, locals }) => {
		const account = locals.account!;
		if (account.accountType !== 'charity') return fail(403, { action: { error: 'Not allowed' } });
		const pickup = await ownPickup(account.id, (await request.formData()).get('requestId'));
		if (!pickup) return fail(404, { action: { error: 'Pickup not found' } });
		if (pickup.status !== 'accepted') {
			return fail(400, { action: { error: 'Only a scheduled pickup can be marked as collected' } });
		}
		await db
			.update(pickupRequests)
			.set({ status: 'completed' })
			.where(eq(pickupRequests.id, pickup.id));
		return { action: { success: true } };
	},

	acceptRequest: async ({ request, locals }) => {
		const account = locals.account!;

		if (account.accountType !== 'charity') {
			return fail(403, { action: { error: 'Only charity accounts can respond to requests' } });
		}

		const formData = await request.formData();
		const requestId = formData.get('requestId');

		if (typeof requestId !== 'string' || !requestId) {
			return fail(400, { action: { error: 'Request ID is required' } });
		}

		const [pickup] = await db
			.select()
			.from(pickupRequests)
			.where(and(eq(pickupRequests.id, requestId), eq(pickupRequests.charityAccountId, account.id)))
			.limit(1);

		if (!pickup) {
			return fail(404, { action: { error: 'Request not found' } });
		}

		if (pickup.status !== 'pending') {
			return fail(400, { action: { error: 'This request has already been answered' } });
		}

		try {
			let reservationId: string | null = null;

			// When a specific offer was attached, create a free reservation (donation) so
			// the charity can collect it at a location with a claim token, like a user.
			if (pickup.offerId) {
				const [offer] = await db
					.select()
					.from(businessOffers)
					.where(eq(businessOffers.id, pickup.offerId))
					.limit(1);

				if (offer && offer.isActive) {
					const [{ count }] = await db
						.select({ count: sql<number>`cast(count(*) as integer)` })
						.from(reservations)
						.where(and(eq(reservations.offerId, offer.id), eq(reservations.status, 'active')));

					if ((count ?? 0) < offer.quantity) {
						const pickupFrom = pickup.proposedPickupFrom ?? new Date();
						const pickupUntil =
							pickup.proposedPickupUntil ?? new Date(pickupFrom.getTime() + 3600000);

						const [reservation] = await db
							.insert(reservations)
							.values({
								id: randomUUID(),
								offerId: offer.id,
								userAccountId: account.id,
								status: 'active',
								pickupFrom,
								pickupUntil,
								claimToken: generateClaimToken()
							})
							.returning();

						reservationId = reservation.id;
					}
				}
			}

			await db
				.update(pickupRequests)
				.set({ status: 'accepted', respondedAt: new Date(), reservationId })
				.where(eq(pickupRequests.id, requestId));

			const url = `${PUBLIC_APP_URL || 'http://localhost:5173'}/charities`;
			await notifyAccount(pickup.businessAccountId, {
				title: 'Pickup request accepted',
				message: 'A charity accepted your food pickup request.',
				tags: ['white_check_mark'],
				priority: 'high',
				click: url,
				actions: [{ action: 'view', label: 'View', url }]
			});

			return { action: { success: true } };
		} catch (err) {
			console.error('Error accepting pickup request:', err);
			return fail(500, { action: { error: 'Failed to accept request. Please try again.' } });
		}
	},

	declineRequest: async ({ request, locals }) => {
		const account = locals.account!;

		if (account.accountType !== 'charity') {
			return fail(403, { action: { error: 'Only charity accounts can respond to requests' } });
		}

		const formData = await request.formData();
		const requestId = formData.get('requestId');
		const notes = (formData.get('notes') as string | null)?.trim() || null;

		if (typeof requestId !== 'string' || !requestId) {
			return fail(400, { action: { error: 'Request ID is required' } });
		}

		const [pickup] = await db
			.select()
			.from(pickupRequests)
			.where(and(eq(pickupRequests.id, requestId), eq(pickupRequests.charityAccountId, account.id)))
			.limit(1);

		if (!pickup) {
			return fail(404, { action: { error: 'Request not found' } });
		}

		if (pickup.status !== 'pending') {
			return fail(400, { action: { error: 'This request has already been answered' } });
		}

		try {
			await db
				.update(pickupRequests)
				.set({ status: 'declined', respondedAt: new Date(), notes })
				.where(eq(pickupRequests.id, requestId));

			const url = `${PUBLIC_APP_URL || 'http://localhost:5173'}/charities`;
			await notifyAccount(pickup.businessAccountId, {
				title: 'Pickup request declined',
				message: 'A charity declined your food pickup request.',
				tags: ['x'],
				priority: 'default',
				click: url,
				actions: [{ action: 'view', label: 'View', url }]
			});

			return { action: { success: true } };
		} catch (err) {
			console.error('Error declining pickup request:', err);
			return fail(500, { action: { error: 'Failed to decline request. Please try again.' } });
		}
	}
};
