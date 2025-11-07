// src/routes/(dock)/locations/[id]/edit/+page.server.ts
import { db } from '$lib/server/db';
import { businessLocations, businessProfiles, files } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getSignedDownloadUrl, uploadFileFromForm } from '$lib/server/backblaze';

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
	const logoUrl = await getSignedDownloadUrl(business.logo!.key);

	// Fetch location image if exists
	let locationImageUrl = null;
	if (locationData.imageId) {
		const image = await db.select().from(files).where(eq(files.id, locationData.imageId)).limit(1);

		if (image.length > 0) {
			locationImageUrl = await getSignedDownloadUrl(image[0].key);
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
		const imageFile = formData.get('image') as File;
		const removeImage = formData.get('removeImage') === 'true';

		// Validate required fields
		if (!name || !address || !city || !zipCode || !country) {
			return fail(400, { error: 'Missing required fields' });
		}

		if (isNaN(latitude) || isNaN(longitude)) {
			return fail(400, { error: 'Invalid coordinates' });
		}

		try {
			let newImageId = location[0].imageId;

			// Handle image removal
			if (removeImage) {
				newImageId = null;
			}
			// Handle new image upload
			else if (imageFile && imageFile.size > 0) {
				// Validate file type
				if (!imageFile.type.startsWith('image/')) {
					return fail(400, { error: 'File must be an image' });
				}

				// Validate file size (5MB)
				if (imageFile.size > 5 * 1024 * 1024) {
					return fail(400, { error: 'Image must be less than 5MB' });
				}

				// Upload to Backblaze
				const uploadResult = await uploadFileFromForm(imageFile);

				if (!uploadResult.success) {
					return fail(500, { error: uploadResult.error || 'Failed to upload file' });
				}

				// Generate unique file ID
				const fileId = crypto.randomUUID();

				// Save file record
				const fileRecord = await db
					.insert(files)
					.values({
						id: fileId,
						key: uploadResult.key,
						fileName: imageFile.name,
						contentType: imageFile.type,
						sizeBytes: imageFile.size,
						uploadedBy: session.accountId
					})
					.returning();

				newImageId = fileRecord[0].id;
			}

			// Update location
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
					longitude,
					imageId: newImageId
				})
				.where(eq(businessLocations.id, params.id));

			return { success: true };
		} catch (err) {
			console.error('Error updating location:', err);
			return fail(500, { error: 'Failed to update location' });
		}
	}
};
