// src/routes/(dock)/profile/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	accounts,
	businessProfiles,
	charityProfiles,
	userProfiles,
	files,
	businessWallets,
	reservations,
	businessOffers
} from '$lib/server/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

// Approximate environmental impact per rescued meal (kept in sync with /impact)
const CO2_PER_MEAL = 1.25; // kg
import { getSignedDownloadUrl } from '$lib/server/backblaze';

export const load: PageServerLoad = async ({ locals }) => {
	const accountId = locals.account!.id;
	const accountType = locals.account!.accountType;

	const accountResult = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);

	if (!accountResult[0]) {
		throw error(404, 'Account not found');
	}

	const account = accountResult[0];
	let profile = null;
	let profilePictureUrl = null;
	let wallet = null;
	let userImpact = null;

	// Load profile data based on account type
	if (accountType === 'business') {
		const businessResult = await db
			.select()
			.from(businessProfiles)
			.where(eq(businessProfiles.accountId, accountId))
			.limit(1);

		if (businessResult[0]) {
			profile = businessResult[0];

			// Get signed URL for profile picture
			const fileResult = await db
				.select()
				.from(files)
				.where(eq(files.id, businessResult[0].profilePictureId))
				.limit(1);

			if (fileResult[0]) {
				profilePictureUrl = await getSignedDownloadUrl(fileResult[0].key);
			}
		}

		// Load wallet configuration for business accounts
		const walletResult = await db
			.select()
			.from(businessWallets)
			.where(eq(businessWallets.accountId, accountId))
			.limit(1);

		if (walletResult[0]) {
			wallet = walletResult[0];
		}
	} else if (accountType === 'charity') {
		const charityResult = await db
			.select()
			.from(charityProfiles)
			.where(eq(charityProfiles.accountId, accountId))
			.limit(1);

		if (charityResult[0]) {
			profile = charityResult[0];

			// Get signed URL for profile picture
			const fileResult = await db
				.select()
				.from(files)
				.where(eq(files.id, charityResult[0].profilePictureId))
				.limit(1);

			if (fileResult[0]) {
				profilePictureUrl = await getSignedDownloadUrl(fileResult[0].key);
			}
		}
	} else if (accountType === 'user') {
		// Load user profile with payment preferences
		const userResult = await db
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.accountId, accountId))
			.limit(1);

		if (userResult[0]) {
			profile = userResult[0];
		}

		// Compact impact summary from claimed reservations
		const claimed = await db
			.select({
				originalValue: businessOffers.originalValue,
				price: businessOffers.price,
				currency: businessOffers.currency
			})
			.from(reservations)
			.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
			.where(
				and(eq(reservations.userAccountId, accountId), eq(reservations.status, 'claimed'))
			);

		const mealsRescued = claimed.length;
		const moneySaved = claimed.reduce((sum, r) => sum + (r.originalValue - r.price), 0);

		// Receipts are available for claimed/completed reservations; active ones are upcoming pickups
		const receiptCountResult = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(reservations)
			.where(
				and(
					eq(reservations.userAccountId, accountId),
					inArray(reservations.status, ['claimed', 'completed'])
				)
			);

		const activeCountResult = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(reservations)
			.where(
				and(eq(reservations.userAccountId, accountId), eq(reservations.status, 'active'))
			);

		userImpact = {
			mealsRescued,
			moneySaved: Math.round(moneySaved * 100) / 100,
			co2Saved: Math.round(mealsRescued * CO2_PER_MEAL * 10) / 10,
			currency: claimed[0]?.currency || 'EUR',
			receiptCount: receiptCountResult[0]?.count ?? 0,
			activeReservations: activeCountResult[0]?.count ?? 0
		};
	}
	// Admin accounts don't have additional profile data

	return {
		account,
		profile,
		profilePictureUrl,
		wallet,
		userImpact
	};
};
