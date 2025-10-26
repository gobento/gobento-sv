// src/routes/(dock)/profile/edit/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
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

	// Load profile based on account type
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

		// Load wallet configuration
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
		// Load user profile with preferences
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

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const { id: accountId, accountType } = locals.account!;
		const formData = await request.formData();

		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const profilePicture = formData.get('profilePicture') as File | null;

		// Payment provider fields
		const paymentProvider = formData.get('paymentProvider') as string;
		const zarinpalMerchantId = formData.get('zarinpalMerchantId') as string;
		const tetherAddress = formData.get('tetherAddress') as string;

		// Validate required fields based on account type
		if (accountType === 'business' || accountType === 'charity') {
			if (!name?.trim()) {
				return fail(400, { error: 'Name is required' });
			}

			if (!description?.trim()) {
				return fail(400, { error: 'Description is required' });
			}
		}

		// Validate payment provider for business accounts
		if (accountType === 'business') {
			if (!paymentProvider || (paymentProvider !== 'zarinpal' && paymentProvider !== 'tether')) {
				return fail(400, { error: 'Please select a payment provider' });
			}

			if (paymentProvider === 'zarinpal' && !zarinpalMerchantId?.trim()) {
				return fail(400, { error: 'Zarinpal Merchant ID is required' });
			}

			if (paymentProvider === 'tether' && !tetherAddress?.trim()) {
				return fail(400, { error: 'USDT wallet address is required' });
			}

			// Validate Tether address format (basic validation)
			if (paymentProvider === 'tether' && tetherAddress) {
				if (!/^0x[a-fA-F0-9]{40}$/.test(tetherAddress.trim())) {
					return fail(400, { error: 'Invalid USDT wallet address format' });
				}
			}
		}

		// Validate payment provider for user accounts (optional)
		if (accountType === 'user' && paymentProvider) {
			if (paymentProvider === 'tether' && tetherAddress?.trim()) {
				// Validate Tether address format
				if (!/^0x[a-fA-F0-9]{40}$/.test(tetherAddress.trim())) {
					return fail(400, { error: 'Invalid USDT wallet address format' });
				}
			}
		}

		try {
			if (accountType === 'business' || accountType === 'charity') {
				const profileTable = accountType === 'business' ? businessProfiles : charityProfiles;

				// Get current profile to check if it has a picture
				const [currentProfile] = await db
					.select()
					.from(profileTable)
					.where(eq(profileTable.accountId, accountId))
					.limit(1);

				let profilePictureId = currentProfile?.profilePictureId;

				// Handle new profile picture upload
				if (profilePicture && profilePicture.size > 0) {
					// Validate file type
					if (!profilePicture.type.startsWith('image/')) {
						return fail(400, { error: 'Only images are allowed' });
					}

					// Validate file size (5MB max)
					const maxSize = 5 * 1024 * 1024;
					if (profilePicture.size > maxSize) {
						return fail(400, { error: 'File size must be less than 5MB' });
					}

					// Upload new file
					const uploadResult = await uploadFileFromForm(profilePicture);

					if (!uploadResult.success) {
						return fail(500, { error: uploadResult.error || 'Failed to upload profile picture' });
					}

					const fileId = randomUUID();
					const storageKey = uploadResult.key;

					// Save file metadata to database
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
					// No new file and no existing file
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

				// Handle wallet configuration for business accounts
				if (accountType === 'business') {
					const [existingWallet] = await db
						.select()
						.from(businessWallets)
						.where(eq(businessWallets.accountId, accountId))
						.limit(1);

					const walletData = {
						zarinpalMerchantId: paymentProvider === 'zarinpal' ? zarinpalMerchantId.trim() : null,
						zarinpalEnabled: paymentProvider === 'zarinpal',
						tetherAddress: paymentProvider === 'tether' ? tetherAddress.trim() : null,
						tetherEnabled: paymentProvider === 'tether',
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
				// Handle user profile updates (only payment preferences)
				const [existingProfile] = await db
					.select()
					.from(userProfiles)
					.where(eq(userProfiles.accountId, accountId))
					.limit(1);

				const userData = {
					preferredPaymentMethod: paymentProvider
						? (paymentProvider as 'zarinpal' | 'tether')
						: null,
					zarinpalMerchantId:
						paymentProvider === 'zarinpal' ? zarinpalMerchantId?.trim() || null : null,
					tetherAddress: paymentProvider === 'tether' ? tetherAddress?.trim() || null : null,
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
