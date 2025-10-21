// src/routes/setup/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	accounts,
	userProfiles,
	businessProfiles,
	charityProfiles,
	files
} from '$lib/server/schema';
import { uploadToBackblaze } from '$lib/server/backblaze';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const actions = {
	setup: async ({ request, locals }) => {
		if (!locals.account) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const accountType = formData.get('accountType') as string;

		// Validate account type
		if (!['user', 'business', 'charity'].includes(accountType)) {
			return fail(400, { error: 'Invalid account type' });
		}

		// Update account type if needed
		if (locals.account.accountType !== accountType) {
			try {
				await db
					.update(accounts)
					.set({ accountType: accountType as 'user' | 'business' | 'charity' })
					.where(eq(accounts.id, locals.account.id));
			} catch (error) {
				console.error('Failed to update account type:', error);
				return fail(500, { error: 'Failed to update account type. Please try again.' });
			}
		}

		// Handle user account (no additional data needed)
		if (accountType === 'user') {
			try {
				await db.insert(userProfiles).values({
					accountId: locals.account.id
				});
			} catch (error) {
				console.error('Failed to create user profile:', error);
				return fail(500, { error: 'Failed to create user profile. Please try again.' });
			}

			redirect(303, '/dashboard');
		}

		// Handle business/charity accounts
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const pictureFile = formData.get('picture') as File;

		// Validate required fields
		if (!name || !description) {
			return fail(400, { error: 'Name and description are required' });
		}

		if (!pictureFile || pictureFile.size === 0) {
			return fail(400, { error: 'Profile picture is required' });
		}

		// Validate file
		if (!pictureFile.type.startsWith('image/')) {
			return fail(400, { error: 'File must be an image' });
		}

		if (pictureFile.size > 5 * 1024 * 1024) {
			return fail(400, { error: 'File size must be less than 5MB' });
		}

		// Generate file metadata
		const fileId = randomUUID();
		const fileExtension = pictureFile.name.split('.').pop() || 'jpg';
		const storageKey = `profiles/${locals.account.id}/${fileId}.${fileExtension}`;

		// Upload to Backblaze
		await uploadToBackblaze(pictureFile, storageKey);

		// Save file record
		await db.insert(files).values({
			id: fileId,
			key: storageKey,
			fileName: pictureFile.name,
			contentType: pictureFile.type,
			sizeBytes: pictureFile.size,
			uploadedBy: locals.account.id
		});

		// Create profile based on type
		if (accountType === 'business') {
			await db.insert(businessProfiles).values({
				accountId: locals.account.id,
				name,
				description,
				profilePictureId: fileId
			});

			return redirect(303, '/locations');
		} else if (accountType === 'charity') {
			await db.insert(charityProfiles).values({
				accountId: locals.account.id,
				name,
				description,
				profilePictureId: fileId
			});

			return redirect(303, '/dashboard');
		}

		// Fallback (should never reach here)
		return fail(500, { error: 'An unexpected error occurred' });
	}
} satisfies Actions;
