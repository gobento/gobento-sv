// src/routes/setup/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { uploadToBackblaze } from '$lib/server/backblaze';
import { db } from '$lib/server/db';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	return {
		user: locals.user
	};
};

export const actions: Actions = {
	setup: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const accountType = formData.get('accountType') as string;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const bankAccount = formData.get('bankAccount') as string;
		const bankRoutingNumber = formData.get('bankRoutingNumber') as string;
		const picture = formData.get('picture') as File | null;

		let pictureKey: string | null = null;

		// Upload picture if provided (for business or charity)
		if (picture && picture.size > 0) {
			try {
				// Generate unique filename
				const timestamp = Date.now();
				const fileExtension = picture.name.split('.').pop();
				const fileName = `${locals.user.id}-${timestamp}.${fileExtension}`;

				// Upload to Backblaze and get the key
				pictureKey = await uploadToBackblaze(picture, `logos/${fileName}`);
			} catch (error) {
				console.error('Error uploading to Backblaze:', error);
				return fail(500, { error: 'Failed to upload image' });
			}
		}

		try {
			// Update user record with picture key (not full URL)
			await db
				.update(users)
				.set({
					name: name || locals.user.name,
					picture: pictureKey || locals.user.picture
				})
				.where(eq(users.id, locals.user.id));

			// TODO: Store additional account setup data (accountType, description, bankAccount, etc.)
			// You might want to create additional tables for this information
		} catch (error) {
			console.error('Error saving user data:', error);
			return fail(500, { error: 'Failed to save account data' });
		}

		throw redirect(303, '/profile');
	}
};
