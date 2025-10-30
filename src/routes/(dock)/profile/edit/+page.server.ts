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

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (
		account.accountType !== 'business' &&
		account.accountType !== 'charity' &&
		account.accountType !== 'user'
	) {
		throw error(403, 'Profile editing not available for this account type');
	}

	let profile = null;
	let profilePictureUrl = null;
	let wallet = null;

	if (account.accountType === 'business') {
		const [businessProfile] = await db
			.select()
			.from(businessProfiles)
			.where(eq(businessProfiles.accountId, account.id))
			.limit(1);

		profile = businessProfile;

		if (profile?.profilePictureId) {
			const [file] = await db
				.select()
				.from(files)
				.where(eq(files.id, profile.profilePictureId))
				.limit(1);
			profilePictureUrl = file ? await getSignedDownloadUrl(file.key) : null;
		}

		const [walletConfig] = await db
			.select()
			.from(businessWallets)
			.where(eq(businessWallets.accountId, account.id))
			.limit(1);

		wallet = walletConfig;
	} else if (account.accountType === 'charity') {
		const [charityProfile] = await db
			.select()
			.from(charityProfiles)
			.where(eq(charityProfiles.accountId, account.id))
			.limit(1);

		profile = charityProfile;

		if (profile?.profilePictureId) {
			const [file] = await db
				.select()
				.from(files)
				.where(eq(files.id, profile.profilePictureId))
				.limit(1);
			profilePictureUrl = file ? await getSignedDownloadUrl(file.key) : null;
		}
	} else if (account.accountType === 'user') {
		const [userProfile] = await db
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.accountId, account.id))
			.limit(1);

		profile = userProfile;
	}

	if (!profile && account.accountType !== 'user') {
		throw error(404, 'Profile not found');
	}

	return {
		account,
		profile,
		profilePictureUrl,
		wallet
	};
};

function validateIBAN(iban: string): boolean {
	const trimmed = iban.replace(/\s/g, '');
	if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(trimmed)) return false;
	if (trimmed.length < 15 || trimmed.length > 34) return false;
	return true;
}

function validateTetherAddress(address: string): boolean {
	return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

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

		// Validate at least one payment method is enabled
		if (!ibanEnabled && !tetherEnabled) {
			return fail(400, { error: 'At least one payment method must be enabled' });
		}

		// Validate IBAN if enabled
		if (ibanEnabled) {
			if (!ibanNumber?.trim()) {
				return fail(400, { error: 'IBAN number is required when Bank Transfer is enabled' });
			}
			if (!validateIBAN(ibanNumber.trim())) {
				return fail(400, { error: 'Invalid IBAN format' });
			}
		}

		// Validate Tether if enabled
		if (tetherEnabled) {
			if (!tetherAddress?.trim()) {
				return fail(400, { error: 'USDT wallet address is required when Crypto is enabled' });
			}
			if (!validateTetherAddress(tetherAddress.trim())) {
				return fail(400, { error: 'Invalid USDT wallet address format (must start with 0x)' });
			}
		}

		// Validate preferred method is enabled
		if (preferredPaymentMethod === 'iban' && !ibanEnabled) {
			return fail(400, { error: 'Cannot set Bank Transfer as preferred when it is disabled' });
		}
		if (preferredPaymentMethod === 'tether' && !tetherEnabled) {
			return fail(400, { error: 'Cannot set Crypto as preferred when it is disabled' });
		}

		// Validate required fields for business/charity
		if (accountType === 'business' || accountType === 'charity') {
			if (!name?.trim()) {
				return fail(400, { error: 'Name is required' });
			}
			if (!description?.trim()) {
				return fail(400, { error: 'Description is required' });
			}
		}

		try {
			if (accountType === 'business' || accountType === 'charity') {
				const profileTable = accountType === 'business' ? businessProfiles : charityProfiles;

				const [currentProfile] = await db
					.select()
					.from(profileTable)
					.where(eq(profileTable.accountId, accountId))
					.limit(1);

				let profilePictureId = currentProfile?.profilePictureId;

				if (profilePicture && profilePicture.size > 0) {
					if (!profilePicture.type.startsWith('image/')) {
						return fail(400, { error: 'Only images are allowed' });
					}

					const maxSize = 5 * 1024 * 1024;
					if (profilePicture.size > maxSize) {
						return fail(400, { error: 'File size must be less than 5MB' });
					}

					const uploadResult = await uploadFileFromForm(profilePicture);

					if (!uploadResult.success) {
						return fail(500, { error: uploadResult.error || 'Failed to upload profile picture' });
					}

					const fileId = randomUUID();
					const storageKey = uploadResult.key;

					await db.insert(files).values({
						id: fileId,
						key: storageKey,
						fileName: profilePicture.name,
						contentType: profilePicture.type,
						sizeBytes: profilePicture.size,
						uploadedBy: accountId
					});

					profilePictureId = fileId;
				} else if (!profilePictureId) {
					return fail(400, { error: 'Profile picture is required' });
				}

				await db
					.update(profileTable)
					.set({
						name: name.trim(),
						description: description.trim(),
						profilePictureId
					})
					.where(eq(profileTable.accountId, accountId));

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
