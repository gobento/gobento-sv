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
	businessWallets
} from '$lib/server/schema';
import { eq } from 'drizzle-orm';
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
	}
	// Admin accounts don't have additional profile data

	return {
		account,
		profile,
		profilePictureUrl,
		wallet
	};
};
