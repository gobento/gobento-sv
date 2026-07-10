// src/routes/(dock)/profile/edit/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	businessProfiles,
	charityProfiles,
	charityFoodPreferences,
	files,
	businessWallets,
	userProfiles
} from '$lib/server/schema';
import { parseFoodTypes } from '$lib/foodTypes';
import type { BusinessWallet } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { uploadImageWithPreset, getSignedDownloadUrl } from '$lib/server/backblaze';
import { randomUUID } from 'crypto';
import { PaymentMethodVerifier } from '$lib/server/payments/verification';

// Existing confirmation state of the stored payment methods
interface StoredPaymentMethods {
	ibanNumber: string | null;
	ibanConfirmed: boolean;
	tetherAddress: string | null;
	tetherConfirmed: boolean;
}

/**
 * Confirm the submitted payment methods, running a test payment only when a
 * method is enabled and its details have changed (or were never confirmed).
 * Already-confirmed, unchanged methods are left untouched.
 */
async function confirmPaymentMethods(params: {
	existing: StoredPaymentMethods | undefined;
	ibanEnabled: boolean;
	tetherEnabled: boolean;
	newIban: string | null;
	newTether: string | null;
}): Promise<
	| { success: true; ibanConfirmed: boolean; tetherConfirmed: boolean }
	| { success: false; error: string }
> {
	let ibanConfirmed = false;
	let tetherConfirmed = false;

	if (params.ibanEnabled) {
		const unchanged =
			!!params.existing?.ibanConfirmed && params.existing.ibanNumber === params.newIban;

		if (unchanged) {
			ibanConfirmed = true;
		} else {
			const result = await PaymentMethodVerifier.verifyIban(params.newIban ?? '');
			if (!result.success) {
				return { success: false, error: result.error ?? 'Bank account verification failed' };
			}
			ibanConfirmed = true;
		}
	}

	if (params.tetherEnabled) {
		const unchanged =
			!!params.existing?.tetherConfirmed && params.existing.tetherAddress === params.newTether;

		if (unchanged) {
			tetherConfirmed = true;
		} else {
			const result = await PaymentMethodVerifier.verifyTether(params.newTether ?? '');
			if (!result.success) {
				return { success: false, error: result.error ?? 'Payment method verification failed' };
			}
			tetherConfirmed = true;
		}
	}

	return { success: true, ibanConfirmed, tetherConfirmed };
}

// Helper functions
async function getProfilePictureUrl(profilePictureId: string | null): Promise<string | null> {
	if (!profilePictureId) return null;

	const [file] = await db.select().from(files).where(eq(files.id, profilePictureId)).limit(1);

	return file ? await getSignedDownloadUrl(file.key) : null;
}

async function uploadProfilePicture(
	picture: File,
	accountId: string
): Promise<{ success: true; fileId: string } | { success: false; error: string }> {
	if (!picture.type.startsWith('image/')) {
		return { success: false, error: 'Only images are allowed' };
	}

	const maxSize = 5 * 1024 * 1024;
	if (picture.size > maxSize) {
		return { success: false, error: 'File size must be less than 5MB' };
	}

	const uploadResult = await uploadImageWithPreset(picture, 'logo');
	if (!uploadResult.success) {
		return { success: false, error: uploadResult.error || 'Failed to upload profile picture' };
	}

	const fileId = randomUUID();
	await db.insert(files).values({
		id: fileId,
		key: uploadResult.key,
		fileName: picture.name,
		contentType: picture.type,
		sizeBytes: picture.size,
		uploadedBy: accountId
	});

	return { success: true, fileId };
}

async function loadBusinessProfile(accountId: string) {
	const [profile] = await db
		.select()
		.from(businessProfiles)
		.where(eq(businessProfiles.accountId, accountId))
		.limit(1);

	const profilePictureUrl = await getProfilePictureUrl(profile?.profilePictureId);

	const [wallet] = await db
		.select()
		.from(businessWallets)
		.where(eq(businessWallets.accountId, accountId))
		.limit(1);

	return { profile, profilePictureUrl, wallet, foodPreferences: [] as string[] };
}

async function loadCharityProfile(accountId: string) {
	const [profile] = await db
		.select()
		.from(charityProfiles)
		.where(eq(charityProfiles.accountId, accountId))
		.limit(1);

	const profilePictureUrl = await getProfilePictureUrl(profile?.profilePictureId);

	const preferenceRows = await db
		.select({ foodType: charityFoodPreferences.foodType })
		.from(charityFoodPreferences)
		.where(eq(charityFoodPreferences.charityAccountId, accountId));

	return {
		profile,
		profilePictureUrl,
		wallet: null,
		foodPreferences: preferenceRows.map((row) => row.foodType)
	};
}

async function loadUserProfile(accountId: string) {
	const [profile] = await db
		.select()
		.from(userProfiles)
		.where(eq(userProfiles.accountId, accountId))
		.limit(1);

	return { profile, profilePictureUrl: null, wallet: null, foodPreferences: [] as string[] };
}

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (!['business', 'charity', 'user'].includes(account.accountType)) {
		throw error(403, 'Profile editing not available for this account type');
	}

	let result;
	if (account.accountType === 'business') {
		result = await loadBusinessProfile(account.id);
	} else if (account.accountType === 'charity') {
		result = await loadCharityProfile(account.id);
	} else {
		result = await loadUserProfile(account.id);
	}

	if (!result.profile && account.accountType !== 'user') {
		throw error(404, 'Profile not found');
	}

	return {
		account,
		...result
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const { id: accountId, accountType } = locals.account!;
		const formData = await request.formData();

		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const profilePicture = formData.get('profilePicture') as File | null;

		// Payment fields
		const ibanEnabled = formData.get('ibanEnabled') === 'true';
		const tetherEnabled = formData.get('tetherEnabled') === 'true';
		const ibanNumber = formData.get('ibanNumber') as string;
		const tetherAddress = formData.get('tetherAddress') as string;
		const preferredPaymentMethod = formData.get('preferredPaymentMethod') as 'iban' | 'tether';

		// Normalized payment details used for both verification and persistence
		const normalizedIban = ibanEnabled ? ibanNumber.trim().replace(/\s/g, '') : null;
		const normalizedTether = tetherEnabled ? tetherAddress.trim() : null;

		try {
			if (accountType === 'business' || accountType === 'charity') {
				const profileTable = accountType === 'business' ? businessProfiles : charityProfiles;

				const [currentProfile] = await db
					.select()
					.from(profileTable)
					.where(eq(profileTable.accountId, accountId))
					.limit(1);

				// Confirm payment methods with a test payment before persisting anything
				// (business only). Running this first avoids orphaned uploads on failure.
				let ibanConfirmed = false;
				let tetherConfirmed = false;
				let existingWallet: BusinessWallet | undefined;

				if (accountType === 'business') {
					[existingWallet] = await db
						.select()
						.from(businessWallets)
						.where(eq(businessWallets.accountId, accountId))
						.limit(1);

					const confirmation = await confirmPaymentMethods({
						existing: existingWallet,
						ibanEnabled,
						tetherEnabled,
						newIban: normalizedIban,
						newTether: normalizedTether
					});

					if (!confirmation.success) {
						return fail(400, { error: confirmation.error });
					}

					ibanConfirmed = confirmation.ibanConfirmed;
					tetherConfirmed = confirmation.tetherConfirmed;
				}

				let profilePictureId = currentProfile?.profilePictureId;

				// Handle profile picture upload
				if (profilePicture && profilePicture.size > 0) {
					const uploadResult = await uploadProfilePicture(profilePicture, accountId);
					if (!uploadResult.success) {
						return fail(400, { error: uploadResult.error });
					}
					profilePictureId = uploadResult.fileId;
				} else if (!profilePictureId) {
					return fail(400, { error: 'Profile picture is required' });
				}

				// Update profile
				await db
					.update(profileTable)
					.set({
						name: name.trim(),
						description: description.trim(),
						profilePictureId
					})
					.where(eq(profileTable.accountId, accountId));

				// Replace the charity's accepted food-type preferences
				if (accountType === 'charity') {
					const selectedFoodTypes = parseFoodTypes(formData.getAll('foodTypes').map(String));

					await db
						.delete(charityFoodPreferences)
						.where(eq(charityFoodPreferences.charityAccountId, accountId));

					if (selectedFoodTypes.length > 0) {
						await db.insert(charityFoodPreferences).values(
							selectedFoodTypes.map((foodType) => ({
								charityAccountId: accountId,
								foodType
							}))
						);
					}
				}

				// Update wallet for business accounts
				if (accountType === 'business') {
					const walletData = {
						ibanNumber: normalizedIban,
						ibanEnabled,
						ibanConfirmed,
						tetherAddress: normalizedTether,
						tetherEnabled,
						tetherConfirmed,
						preferredPaymentMethod,
						updatedAt: new Date()
					};

					if (existingWallet) {
						await db
							.update(businessWallets)
							.set(walletData)
							.where(eq(businessWallets.accountId, accountId));
					} else {
						await db.insert(businessWallets).values({
							accountId,
							...walletData
						});
					}
				}
			} else if (accountType === 'user') {
				const [existingProfile] = await db
					.select()
					.from(userProfiles)
					.where(eq(userProfiles.accountId, accountId))
					.limit(1);

				// Confirm payment methods with a test payment before persisting
				const confirmation = await confirmPaymentMethods({
					existing: existingProfile,
					ibanEnabled,
					tetherEnabled,
					newIban: normalizedIban,
					newTether: normalizedTether
				});

				if (!confirmation.success) {
					return fail(400, { error: confirmation.error });
				}

				const userData = {
					ibanNumber: normalizedIban,
					ibanEnabled,
					ibanConfirmed: confirmation.ibanConfirmed,
					tetherAddress: normalizedTether,
					tetherEnabled,
					tetherConfirmed: confirmation.tetherConfirmed,
					preferredPaymentMethod,
					updatedAt: new Date()
				};

				if (existingProfile) {
					await db.update(userProfiles).set(userData).where(eq(userProfiles.accountId, accountId));
				} else {
					await db.insert(userProfiles).values({
						accountId,
						...userData
					});
				}
			}

			return { success: true };
		} catch (err) {
			console.error('Profile update error:', err);
			return fail(500, { error: 'Failed to update profile' });
		}
	}
};
