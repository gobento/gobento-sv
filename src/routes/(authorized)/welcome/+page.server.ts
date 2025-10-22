// src/routes/welcome/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import * as v from 'valibot';
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

// Validation schemas
const userSetupSchema = v.object({
	accountType: v.literal('user')
});

const businessSetupSchema = v.object({
	accountType: v.literal('business'),
	name: v.pipe(
		v.string(),
		v.minLength(1, 'Name is required'),
		v.maxLength(100, 'Name must be less than 100 characters')
	),
	description: v.pipe(
		v.string(),
		v.minLength(1, 'Description is required'),
		v.maxLength(500, 'Description must be less than 500 characters')
	),
	country: v.pipe(
		v.string(),
		v.minLength(1, 'Country is required'),
		v.maxLength(100, 'Country must be less than 100 characters')
	)
});

const charitySetupSchema = v.object({
	accountType: v.literal('charity'),
	name: v.pipe(
		v.string(),
		v.minLength(1, 'Name is required'),
		v.maxLength(100, 'Name must be less than 100 characters')
	),
	description: v.pipe(
		v.string(),
		v.minLength(1, 'Description is required'),
		v.maxLength(500, 'Description must be less than 500 characters')
	),
	country: v.pipe(
		v.string(),
		v.minLength(1, 'Country is required'),
		v.maxLength(100, 'Country must be less than 100 characters')
	)
});

// Union schema for all account types
const setupSchema = v.variant('accountType', [
	userSetupSchema,
	businessSetupSchema,
	charitySetupSchema
]);

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.account) {
		redirect(303, '/login');
	}

	// Initialize form with empty values
	const form = await superValidate(valibot(setupSchema));

	return {
		form
	};
};

export const actions = {
	setup: async ({ request, locals }) => {
		if (!locals.account) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const form = await superValidate(formData, valibot(setupSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { accountType } = form.data;

		try {
			// Update account type if needed
			if (locals.account.accountType !== accountType) {
				await db.update(accounts).set({ accountType }).where(eq(accounts.id, locals.account.id));
			}

			// Handle user account (no additional data needed)
			if (accountType === 'user') {
				await db.insert(userProfiles).values({
					accountId: locals.account.id
				});
			} else {
				// Handle business/charity accounts - require profile picture
				const pictureFile = formData.get('picture') as File;

				if (!pictureFile || pictureFile.size === 0) {
					return fail(400, {
						form,
						error: 'Profile picture is required'
					});
				}

				// Validate file
				if (!pictureFile.type.startsWith('image/')) {
					return fail(400, {
						form,
						error: 'File must be an image'
					});
				}

				if (pictureFile.size > 5 * 1024 * 1024) {
					return fail(400, {
						form,
						error: 'File size must be less than 5MB'
					});
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
						name: form.data.name,
						description: form.data.description,
						country: form.data.country,
						profilePictureId: fileId
					});
				} else if (accountType === 'charity') {
					await db.insert(charityProfiles).values({
						accountId: locals.account.id,
						name: form.data.name,
						description: form.data.description,
						country: form.data.country,
						profilePictureId: fileId
					});
				}
			}
		} catch (error) {
			console.error('Setup error:', error);
			return fail(500, {
				form,
				error: 'An unexpected error occurred. Please try again.'
			});
		}

		// Redirect after successful setup (outside try-catch)
		if (accountType === 'user') {
			redirect(303, '/dashboard');
		} else if (accountType === 'business') {
			redirect(303, '/locations');
		} else if (accountType === 'charity') {
			redirect(303, '/dashboard');
		}

		// Fallback (should never reach here)
		return fail(500, {
			form,
			error: 'An unexpected error occurred'
		});
	}
} satisfies Actions;
