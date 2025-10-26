// src/routes/(dock)/profile/edit/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { businessProfiles, charityProfiles, files } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { uploadFileFromForm, getSignedDownloadUrl } from '$lib/server/backblaze';
import { randomUUID } from 'crypto';

export const load: PageServerLoad = async ({ locals }) => {
	const { id: accountId, accountType } = locals.account!;

	if (accountType !== 'business' && accountType !== 'charity') {
		throw error(403, 'Only business and charity accounts can edit profiles');
	}

	// Load profile based on account type
	const profileTable = accountType === 'business' ? businessProfiles : charityProfiles;
	const [profile] = await db
		.select()
		.from(profileTable)
		.where(eq(profileTable.accountId, accountId))
		.limit(1);

	if (!profile) {
		throw error(404, 'Profile not found');
	}

	// Get signed URL for profile picture
	let profilePictureUrl = null;
	if (profile.profilePictureId) {
		const [file] = await db
			.select()
			.from(files)
			.where(eq(files.id, profile.profilePictureId))
			.limit(1);

		profilePictureUrl = file ? await getSignedDownloadUrl(file.key) : null;
	}

	return {
		account: locals.account,
		profile,
		profilePictureUrl
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const { id: accountId, accountType } = locals.account!;
		const formData = await request.formData();

		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const profilePicture = formData.get('profilePicture') as File | null;

		// Validate required fields
		if (!name?.trim()) {
			return fail(400, { error: 'Name is required' });
		}

		if (!description?.trim()) {
			return fail(400, { error: 'Description is required' });
		}

		try {
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

				// Upload new file using the correct function
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

			return { success: true };
		} catch (err) {
			console.error('Profile update error:', err);
			return fail(500, { error: 'Failed to update profile' });
		}
	}
};
