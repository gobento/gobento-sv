// src/routes/(dock)/locations/[id]/edit/+page.server.ts
import { db } from '$lib/server/db';
import { businessLocations, businessProfiles, files, accounts } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { uploadToBackblaze, getSignedDownloadUrl } from '$lib/server/backblaze';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = locals.session!;

	// Fetch the location
	const location = await db
		.select()
		.from(businessLocations)
		.where(eq(businessLocations.id, params.id))
		.limit(1);

	if (location.length === 0) {
		throw error(404, 'Location not found');
	}

	const locationData = location[0];

	// Verify ownership
	if (locationData.businessAccountId !== session.accountId) {
		throw error(403, 'You do not have permission to edit this location');
	}

	// Fetch business profile
	const businesses = await db
		.select({
			name: businessProfiles.name,
			logo: files
		})
		.from(businessProfiles)
		.where(eq(businessProfiles.accountId, locationData.businessAccountId))
		.leftJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.limit(1);

	if (businesses.length === 0) {
		throw error(404, 'Business not found');
	}

	const business = businesses[0];
	const logoUrl = await getSignedDownloadUrl(business.logo!.key, 3600);

	// Fetch location image if exists
	let locationImageUrl = null;
	if (locationData.imageId) {
		const image = await db.select().from(files).where(eq(files.id, locationData.imageId)).limit(1);

		if (image.length > 0) {
			locationImageUrl = await getSignedDownloadUrl(image[0].key, 3600);
		}
	}

	return {
		location: {
			id: locationData.id,
			name: locationData.name,
			address: locationData.address,
			city: locationData.city,
			province: locationData.province,
			zipCode: locationData.zipCode,
			country: locationData.country,
			latitude: locationData.latitude,
			longitude: locationData.longitude,
			imageId: locationData.imageId
		},
		business: {
			name: business.name,
			logo: { url: logoUrl }
		},
		locationImageUrl
	};
};

export const actions: Actions = {
	updateLocation: async ({ params, locals, request }) => {
		const session = locals.session!;
		const formData = await request.formData();

		// Verify ownership
		const location = await db
			.select()
			.from(businessLocations)
			.where(eq(businessLocations.id, params.id))
			.limit(1);

		if (location.length === 0) {
			return fail(404, { error: 'Location not found' });
		}

		if (location[0].businessAccountId !== session.accountId) {
			return fail(403, { error: 'Unauthorized' });
		}

		// Extract form data
		const name = formData.get('name') as string;
		const address = formData.get('address') as string;
		const city = formData.get('city') as string;
		const province = formData.get('province') as string;
		const zipCode = formData.get('zipCode') as string;
		const country = formData.get('country') as string;
		const latitude = parseFloat(formData.get('latitude') as string);
		const longitude = parseFloat(formData.get('longitude') as string);

		// Validate required fields
		if (!name || !address || !city || !zipCode || !country) {
			return fail(400, { error: 'Missing required fields' });
		}

		if (isNaN(latitude) || isNaN(longitude)) {
			return fail(400, { error: 'Invalid coordinates' });
		}

		try {
			await db
				.update(businessLocations)
				.set({
					name,
					address,
					city,
					province: province || null,
					zipCode,
					country,
					latitude,
					longitude
				})
				.where(eq(businessLocations.id, params.id));

			return { success: true };
		} catch (err) {
			console.error('Error updating location:', err);
			return fail(500, { error: 'Failed to update location' });
		}
	},

	uploadImage: async ({ params, locals, request }) => {
		const session = locals.session!;
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file || file.size === 0) {
			return fail(400, { error: 'No file provided' });
		}

		// Verify ownership
		const location = await db
			.select()
			.from(businessLocations)
			.where(eq(businessLocations.id, params.id))
			.limit(1);

		if (location.length === 0) {
			return fail(404, { error: 'Location not found' });
		}

		if (location[0].businessAccountId !== session.accountId) {
			return fail(403, { error: 'Unauthorized' });
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			return fail(400, { error: 'File must be an image' });
		}

		// Validate file size (5MB max)
		const maxSize = 5 * 1024 * 1024;
		if (file.size > maxSize) {
			return fail(400, { error: 'File size must be less than 5MB' });
		}

		try {
			// Generate unique key for storage
			const fileId = crypto.randomUUID();
			const key = `locations/${params.id}/${fileId}-${file.name}`;

			// Upload to Backblaze
			await uploadToBackblaze(file, key);

			// Save file record
			const fileRecord = await db
				.insert(files)
				.values({
					id: fileId,
					key,
					fileName: file.name,
					contentType: file.type,
					sizeBytes: file.size,
					uploadedBy: session.accountId
				})
				.returning();

			// Update location with new image
			await db
				.update(businessLocations)
				.set({
					imageId: fileRecord[0].id
				})
				.where(eq(businessLocations.id, params.id));

			const url = await getSignedDownloadUrl(key, 3600);

			return {
				success: true,
				url,
				fileName: file.name,
				key
			};
		} catch (err) {
			console.error('Error uploading image:', err);
			return fail(500, { error: 'Failed to upload image' });
		}
	},

	removeImage: async ({ params, locals }) => {
		const session = locals.session!;

		// Verify ownership
		const location = await db
			.select()
			.from(businessLocations)
			.where(eq(businessLocations.id, params.id))
			.limit(1);

		if (location.length === 0) {
			return fail(404, { error: 'Location not found' });
		}

		if (location[0].businessAccountId !== session.accountId) {
			return fail(403, { error: 'Unauthorized' });
		}

		try {
			await db
				.update(businessLocations)
				.set({
					imageId: null
				})
				.where(eq(businessLocations.id, params.id));

			return { success: true };
		} catch (err) {
			console.error('Error removing image:', err);
			return fail(500, { error: 'Failed to remove image' });
		}
	}
};
