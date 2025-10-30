// src/routes/(dock)/profile/edit/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	businessProfiles,
	charityProfiles,
	files,
	businessWallets,
	userProfiles
} from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { uploadFileFromForm, getSignedDownloadUrl } from '$lib/server/backblaze';
import { randomUUID } from 'crypto';

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

	const uploadResult = await uploadFileFromForm(picture);
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

	return { profile, profilePictureUrl, wallet };
}

async function loadCharityProfile(accountId: string) {
	const [profile] = await db
		.select()
		.from(charityProfiles)
		.where(eq(charityProfiles.accountId, accountId))
		.limit(1);

	const profilePictureUrl = await getProfilePictureUrl(profile?.profilePictureId);

	return { profile, profilePictureUrl, wallet: null };
}

async function loadUserProfile(accountId: string) {
	const [profile] = await db
		.select()
		.from(userProfiles)
		.where(eq(userProfiles.accountId, accountId))
		.limit(1);

	return { profile, profilePictureUrl: null, wallet: null };
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

		try {
			if (accountType === 'business' || accountType === 'charity') {
				const profileTable = accountType === 'business' ? businessProfiles : charityProfiles;

				const [currentProfile] = await db
					.select()
					.from(profileTable)
					.where(eq(profileTable.accountId, accountId))
					.limit(1);

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

				// Update wallet for business accounts
				if (accountType === 'business') {
					const [existingWallet] = await db
						.select()
						.from(businessWallets)
						.where(eq(businessWallets.accountId, accountId))
						.limit(1);

					const walletData = {
						ibanNumber: ibanEnabled ? ibanNumber.trim().replace(/\s/g, '') : null,
						ibanEnabled,
						tetherAddress: tetherEnabled ? tetherAddress.trim() : null,
						tetherEnabled,
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

				const userData = {
					ibanNumber: ibanEnabled ? ibanNumber.trim().replace(/\s/g, '') : null,
					ibanEnabled,
					tetherAddress: tetherEnabled ? tetherAddress.trim() : null,
					tetherEnabled,
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
