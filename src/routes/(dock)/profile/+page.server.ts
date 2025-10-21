// src/routes/(app)/profile/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { accounts, businessProfiles, charityProfiles, files } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { uploadToBackblaze, getSignedDownloadUrl } from '$lib/server/backblaze';
import { randomUUID } from 'crypto';

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
	}

	return {
		account,
		profile,
		profilePictureUrl
	};
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		const accountId = locals.account!.id;
		const accountType = locals.account!.accountType;

		// Only allow uploads for business and charity accounts
		if (accountType !== 'business' && accountType !== 'charity') {
			return fail(403, { error: 'File uploads not allowed for this account type' });
		}

		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file || file.size === 0) {
			return fail(400, { error: 'No file provided' });
		}

		// Validate file type (images only)
		if (!file.type.startsWith('image/')) {
			return fail(400, { error: 'Only images are allowed' });
		}

		// Validate file size (5MB max)
		const maxSize = 5 * 1024 * 1024;
		if (file.size > maxSize) {
			return fail(400, { error: 'File size must be less than 5MB' });
		}

		try {
			const fileId = randomUUID();
			const key = `profile-pictures/${accountId}/${fileId}`;

			// Upload to Backblaze
			await uploadToBackblaze(file, key);

			// Save file metadata to database
			await db.insert(files).values({
				id: fileId,
				key,
				fileName: file.name,
				contentType: file.type,
				sizeBytes: file.size,
				uploadedBy: accountId
			});

			return {
				success: true,
				url: await getSignedDownloadUrl(key),
				fileName: file.name,
				key: fileId
			};
		} catch (err) {
			console.error('Upload error:', err);
			return fail(500, { error: 'Upload failed' });
		}
	},

	updateProfile: async ({ request, locals }) => {
		const accountId = locals.account!.id;
		const accountType = locals.account!.accountType;
		const formData = await request.formData();

		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const profilePictureId = formData.get('profilePictureId') as string;

		if (!name || name.trim().length === 0) {
			return fail(400, { error: 'Name is required' });
		}

		if (!description || description.trim().length === 0) {
			return fail(400, { error: 'Description is required' });
		}

		if (!profilePictureId) {
			return fail(400, { error: 'Profile picture is required' });
		}

		try {
			if (accountType === 'business') {
				// Check if profile exists
				const existing = await db
					.select()
					.from(businessProfiles)
					.where(eq(businessProfiles.accountId, accountId))
					.limit(1);

				if (existing[0]) {
					// Update existing
					await db
						.update(businessProfiles)
						.set({
							name: name.trim(),
							description: description.trim(),
							profilePictureId
						})
						.where(eq(businessProfiles.accountId, accountId));
				} else {
					// Create new
					await db.insert(businessProfiles).values({
						accountId,
						name: name.trim(),
						description: description.trim(),
						profilePictureId
					});
				}
			} else if (accountType === 'charity') {
				// Check if profile exists
				const existing = await db
					.select()
					.from(charityProfiles)
					.where(eq(charityProfiles.accountId, accountId))
					.limit(1);

				if (existing[0]) {
					// Update existing
					await db
						.update(charityProfiles)
						.set({
							name: name.trim(),
							description: description.trim(),
							profilePictureId
						})
						.where(eq(charityProfiles.accountId, accountId));
				} else {
					// Create new
					await db.insert(charityProfiles).values({
						accountId,
						name: name.trim(),
						description: description.trim(),
						profilePictureId
					});
				}
			} else {
				return fail(400, { error: 'Profile editing not available for this account type' });
			}

			return { success: true };
		} catch (err) {
			console.error('Profile update error:', err);
			return fail(500, { error: 'Failed to update profile' });
		}
	}
};
