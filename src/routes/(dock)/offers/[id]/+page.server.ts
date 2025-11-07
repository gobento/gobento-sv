// src/routes/(dock)/offers/[id]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	businessOffers,
	businessLocations,
	businessProfiles,
	files,
	accounts,
	reservations,
	businessWallets
} from '$lib/server/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getSignedDownloadUrl } from '$lib/server/backblaze';
import { priceWithMargin } from '$lib/server/payments/currency';

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

	// Get business payment preferences
	const [wallet] = await db
		.select()
		.from(businessWallets)
		.where(eq(businessWallets.accountId, offer.businessAccountId))
		.limit(1);

	if (!wallet || (!wallet.ibanEnabled && !wallet.tetherEnabled)) {
		throw error(500, 'Business has not configured payment methods');
	}

	// Count active reservations for this offer
	const [reservationCount] = await db
		.select({ count: sql<number>`cast(count(*) as integer)` })
		.from(reservations)
		.where(and(eq(reservations.offerId, offer.id), eq(reservations.status, 'active')));

	const activeReservationCount = reservationCount?.count || 0;
	const availableQuantity = offer.quantity - activeReservationCount;

	// Check for existing active reservation by current user
	let userReservation = null;
	if (offer.isActive && account) {
		const [existingReservation] = await db
			.select()
			.from(reservations)
			.where(
				and(
					eq(reservations.offerId, offer.id),
					eq(reservations.userAccountId, account.id),
					eq(reservations.status, 'active')
				)
			)
			.limit(1);

		if (existingReservation) {
			userReservation = existingReservation;
		}
	}

	const isOwner = account.id === offer.businessAccountId;
	const isUser = account.accountType === 'user';
	const logoUrl = await getSignedDownloadUrl(logo.key);

	// Get location image URL if exists
	let locationImageUrl = null;
	if (location?.imageId) {
		const [locationImage] = await db
			.select()
			.from(files)
			.where(eq(files.id, location.imageId))
			.limit(1);

		if (locationImage) {
			locationImageUrl = await getSignedDownloadUrl(locationImage.key);
		}
	}

	const result = {
		offer: {
			...offer,
			displayPrice: priceWithMargin(offer.price),
			displayOriginalValue: offer.originalValue
		},
		location: location
			? {
					...location,
					imageUrl: locationImageUrl
				}
			: null,
		business: {
			name: business.name,
			description: business.description,
			businessType: business.businessType,
			country: business.country
		},
		logo: {
			id: logo.id,
			url: logoUrl,
			fileName: logo.fileName
		},
		availability: {
			total: offer.quantity,
			reserved: activeReservationCount,
			available: availableQuantity
		},
		isOwner,
		isUser,

		isReserved: activeReservationCount >= offer.quantity,
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

	console.log('result', result);
	return result;
};
