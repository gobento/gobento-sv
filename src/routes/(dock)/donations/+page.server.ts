// src/routes/(dock)/donations/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	pickupRequests,
	businessProfiles,
	businessLocations,
	businessOffers,
	reservations,
	files
} from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { getSignedDownloadUrl } from '$lib/server/backblaze';
import { notifyAccount } from '$lib/server/notifications';
import { randomUUID } from 'crypto';
import { env } from '$env/dynamic/private';

function generateClaimToken(): string {
	return `CLAIM-${randomUUID()}`;
}

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'charity') {
		throw error(403, 'Only charity accounts can access donations');
	}

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
			businessName: businessProfiles.name,
			logoKey: files.key,
			locationName: businessLocations.name,
			locationCity: businessLocations.city,
			locationAddress: businessLocations.address,
			offerId: businessOffers.id,
			offerName: businessOffers.name,
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

	return { requests };
};

export const actions: Actions = {
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

			const url = `${env.PUBLIC_APP_URL || 'http://localhost:5173'}/charities`;
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

			const url = `${env.PUBLIC_APP_URL || 'http://localhost:5173'}/charities`;
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
