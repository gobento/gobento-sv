// src/routes/(dock)/reservations/+page.server.ts
import { db } from '$lib/server/db';
import {
	reservations,
	businessOffers,
	businessLocations,
	businessProfiles,
	files,
	accounts
} from '$lib/server/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated and is a regular user
	if (!locals.account || locals.account.accountType !== 'user') {
		throw error(401, 'Unauthorized');
	}

	// Fetch all reservations for the current user (active, claimed, completed)
	// Excluding only expired ones for better UX
	const userReservations = await db
		.select({
			id: reservations.id,
			status: reservations.status,
			pickupFrom: reservations.pickupFrom,
			pickupUntil: reservations.pickupUntil,
			reservedAt: reservations.reservedAt,
			claimedAt: reservations.claimedAt,
			completedAt: reservations.completedAt,
			notes: reservations.notes,
			offer: {
				id: businessOffers.id,
				name: businessOffers.name,
				description: businessOffers.description,
				price: businessOffers.price,
				currency: businessOffers.currency
			},
			location: {
				id: businessLocations.id,
				name: businessLocations.name,
				address: businessLocations.address,
				city: businessLocations.city,
				state: businessLocations.state,
				zipCode: businessLocations.zipCode,
				country: businessLocations.country
			},
			business: {
				name: businessProfiles.name,
				profilePictureId: businessProfiles.profilePictureId
			},
			profilePicture: {
				key: files.key,
				fileName: files.fileName
			}
		})
		.from(reservations)
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.leftJoin(businessLocations, eq(businessOffers.locationId, businessLocations.id))
		.innerJoin(accounts, eq(businessOffers.businessAccountId, accounts.id))
		.innerJoin(businessProfiles, eq(businessOffers.businessAccountId, businessProfiles.accountId))
		.innerJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.where(
			and(
				eq(reservations.userAccountId, locals.account.id),
				inArray(reservations.status, ['active', 'claimed', 'completed'])
			)
		)
		.orderBy(reservations.pickupFrom);

	return {
		reservations: userReservations
	};
};
