// src/routes/(dock)/locations/new/+page.server.ts
import { db } from '$lib/server/db';
import { businessLocations, businessProfiles, files } from '$lib/server/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { Actions, PageServerLoad } from './$types';
import { uploadImageWithPreset } from '$lib/server/backblaze';

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'business') {
		throw error(403, 'Only business accounts can create locations');
	}

	// Fetch business profile to get country
	const businessProfile = await db
		.select()
		.from(businessProfiles)
		.where(eq(businessProfiles.accountId, account.id))
		.limit(1);

	if (businessProfile.length === 0) {
		throw error(404, 'Business profile not found');
	}

	return {
		businessCountry: businessProfile[0].country
	};
};

export const actions = {
	default: async ({ locals, request }) => {
		const account = locals.account!;

		if (account.accountType !== 'business') {
			return fail(403, { message: 'Only business accounts can create locations' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const address = formData.get('address') as string;
		const city = formData.get('city') as string;
		const province = formData.get('province') as string;
		const zipCode = formData.get('zipCode') as string;
		const country = formData.get('country') as string;
		const latitude = parseFloat(formData.get('latitude') as string);
		const longitude = parseFloat(formData.get('longitude') as string);
		const locationImageFile = formData.get('locationImage') as File;

		// Validation
		if (!name || name.trim().length === 0) {
			return fail(400, { message: 'Location name is required', field: 'name' });
		}

		if (!address || address.trim().length === 0) {
			return fail(400, { message: 'Street address is required', field: 'address' });
		}

		if (!city || city.trim().length === 0) {
			return fail(400, { message: 'City is required', field: 'city' });
		}

		if (!zipCode || zipCode.trim().length === 0) {
			return fail(400, { message: 'ZIP code is required', field: 'zipCode' });
		}

		if (!country || country.trim().length === 0) {
			return fail(400, { message: 'Country is required', field: 'country' });
		}

		if (isNaN(latitude) || isNaN(longitude)) {
			return fail(400, {
				message: 'Invalid coordinates. Please use the address search to set location.',
				field: 'latitude'
			});
		}

		// Validate coordinates are within reasonable bounds
		if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
			return fail(400, {
				message: 'Coordinates out of range',
				field: 'latitude'
			});
		}

		// Validate location image
		if (!locationImageFile || locationImageFile.size === 0) {
			return fail(400, {
				message: 'Location image is required',
				field: 'locationImage'
			});
		}

		if (!locationImageFile.type.startsWith('image/')) {
			return fail(400, {
				message: 'File must be an image',
				field: 'locationImage'
			});
		}

		const maxSize = 5 * 1024 * 1024; // 5MB
		if (locationImageFile.size > maxSize) {
			return fail(400, {
				message: 'Image size must be less than 5MB',
				field: 'locationImage'
			});
		}

		// Upload the location image first
		const imageUploadResult = await uploadImageWithPreset(locationImageFile, 'locationImage');

		if (!imageUploadResult.success) {
			return fail(500, {
				message: imageUploadResult.error || 'Failed to upload location image',
				field: 'locationImage'
			});
		}

		// Create file record in database
		const fileId = randomUUID();
		try {
			await db.insert(files).values({
				id: fileId,
				key: imageUploadResult.key,
				fileName: locationImageFile.name,
				contentType: locationImageFile.type,
				sizeBytes: locationImageFile.size,
				uploadedBy: account.id
			});
		} catch (e) {
			console.error('Failed to create file record:', e);
			return fail(500, { message: 'Failed to save file information' });
		}

		// Create location with image reference
		const locationId = randomUUID();
		try {
			await db.insert(businessLocations).values({
				id: locationId,
				businessAccountId: account.id,
				name: name.trim(),
				address: address.trim(),
				city: city.trim(),
				province: province?.trim() || null,
				zipCode: zipCode.trim(),
				country: country.trim(),
				latitude,
				longitude,
				imageId: fileId
			});
		} catch (e) {
			console.error('Failed to create location:', e);
			return fail(500, { message: 'Failed to create location' });
		}

		// Success - redirect to locations page
		throw redirect(303, '/locations');
	}
} satisfies Actions;
