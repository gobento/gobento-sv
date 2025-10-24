// src/routes/(dock)/profile/edit/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { businessProfiles, charityProfiles, files } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { uploadToBackblaze, getSignedDownloadUrl } from '$lib/server/backblaze';
import { randomUUID } from 'crypto';

export const load: PageServerLoad = async ({ locals }) => {
	const { id: accountId, accountType } = locals.account!;

	// Only business and charity accounts can edit profiles
	if (accountType !== 'business' && accountType !== 'charity') {
		throw redirect(302, '/profile');
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
	const [file] = await db
		.select()
		.from(files)
		.where(eq(files.id, profile.profilePictureId))
		.limit(1);

	const profilePictureUrl = file ? await getSignedDownloadUrl(file.key) : null;

	return {
		account: locals.account,
		profile,
		profilePictureUrl
	};
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		const { id: accountId, accountType } = locals.account!;

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
		const { id: accountId, accountType } = locals.account!;
		const formData = await request.formData();

		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const profilePictureId = formData.get('profilePictureId') as string;

		if (!name?.trim()) {
			return fail(400, { error: 'Name is required' });
		}

		if (!description?.trim()) {
			return fail(400, { error: 'Description is required' });
		}

		if (!profilePictureId) {
			return fail(400, { error: 'Profile picture is required' });
		}

		try {
			const profileTable = accountType === 'business' ? businessProfiles : charityProfiles;

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
