// src/routes/(dock)/offers/new/+page.server.ts
import { db } from '$lib/server/db';
import { businessLocations, businessOffers, businessProfiles, files } from '$lib/server/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { Actions, PageServerLoad } from './$types';
import { notifyNewOffer } from '$lib/server/notifications';
import { uploadImageWithPreset } from '$lib/server/backblaze';

export const load: PageServerLoad = async ({ locals, url }) => {
	const account = locals.account!;

	if (account.accountType !== 'business') {
		throw error(403, 'Only business accounts can create offers');
	}

	// Businesses must be approved by a moderator before they can post offers
	const [profile] = await db
		.select({ verificationStatus: businessProfiles.verificationStatus })
		.from(businessProfiles)
		.where(eq(businessProfiles.accountId, account.id))
		.limit(1);

	if (profile?.verificationStatus !== 'verified') {
		throw redirect(303, '/offers');
	}

	// Get the locationId from query params if present
	const locationId = url.searchParams.get('locationId');

	// Fetch all locations for this business
	const locations = await db
		.select({
			id: businessLocations.id,
			name: businessLocations.name,
			address: businessLocations.address,
			city: businessLocations.city,
			province: businessLocations.province
		})
		.from(businessLocations)
		.where(eq(businessLocations.businessAccountId, account.id))
		.orderBy(businessLocations.name);

	return {
		locations,
		preselectedLocationId: locationId || null
	};
};

export const actions = {
	default: async ({ locals, request }) => {
		const session = locals.session;
		const account = locals.account;

		if (!session || !account) {
			return fail(401, { message: 'Unauthorized' });
		}

		if (account.accountType !== 'business') {
			return fail(403, { message: 'Only business accounts can create offers' });
		}

		// Businesses must be approved by a moderator before they can post offers
		const [profile] = await db
			.select({ verificationStatus: businessProfiles.verificationStatus })
			.from(businessProfiles)
			.where(eq(businessProfiles.accountId, account.id))
			.limit(1);

		if (profile?.verificationStatus !== 'verified') {
			return fail(403, {
				message: 'Your business must be approved by a moderator before you can post offers'
			});
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const originalValue = parseFloat(formData.get('originalValue') as string);
		const price = parseFloat(formData.get('price') as string);
		const quantity = parseInt(formData.get('quantity') as string);
		const locationId = formData.get('locationId') as string;
		const isRecurring = formData.get('isRecurring') === 'on';
		const pickupTimeFrom = formData.get('pickupTimeFrom') as string;
		const pickupTimeUntil = formData.get('pickupTimeUntil') as string;
		const validUntilStr = formData.get('validUntil') as string;
		const offerImageFile = formData.get('offerImage') as File;

		// Validation
		if (!name || name.trim().length === 0) {
			return fail(400, { message: 'Offer name is required', field: 'name' });
		}

		if (!description || description.trim().length === 0) {
			return fail(400, { message: 'Description is required', field: 'description' });
		}

		if (isNaN(originalValue) || originalValue <= 0) {
			return fail(400, {
				message: 'Original value must be greater than 0',
				field: 'originalValue'
			});
		}

		if (isNaN(price) || price <= 0) {
			return fail(400, { message: 'Price must be greater than 0', field: 'price' });
		}

		if (price >= originalValue) {
			return fail(400, {
				message: 'Discounted price must be less than original value',
				field: 'price'
			});
		}

		if (isNaN(quantity) || quantity < 1) {
			return fail(400, { message: 'Quantity must be at least 1', field: 'quantity' });
		}

		// Validate offer image
		if (!offerImageFile || offerImageFile.size === 0) {
			return fail(400, { message: 'Offer image is required', field: 'offerImage' });
		}

		if (!offerImageFile.type.startsWith('image/')) {
			return fail(400, { message: 'File must be an image', field: 'offerImage' });
		}

		if (offerImageFile.size > 5 * 1024 * 1024) {
			return fail(400, { message: 'Image size must be less than 5MB', field: 'offerImage' });
		}

		// Validate pickup times
		if (!pickupTimeFrom || pickupTimeFrom.trim().length === 0) {
			return fail(400, { message: 'Pickup start time is required', field: 'pickupTimeFrom' });
		}

		if (!pickupTimeUntil || pickupTimeUntil.trim().length === 0) {
			return fail(400, { message: 'Pickup end time is required', field: 'pickupTimeUntil' });
		}

		// Validate time format (HH:MM)
		const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
		if (!timeRegex.test(pickupTimeFrom)) {
			return fail(400, { message: 'Invalid pickup start time format', field: 'pickupTimeFrom' });
		}

		if (!timeRegex.test(pickupTimeUntil)) {
			return fail(400, { message: 'Invalid pickup end time format', field: 'pickupTimeUntil' });
		}

		// Ensure pickup end time is after start time
		const [fromHours, fromMinutes] = pickupTimeFrom.split(':').map(Number);
		const [untilHours, untilMinutes] = pickupTimeUntil.split(':').map(Number);
		const fromTotalMinutes = fromHours * 60 + fromMinutes;
		const untilTotalMinutes = untilHours * 60 + untilMinutes;

		const currency = 'EUR'; //todo: use the currency of the country the business resides in

		if (untilTotalMinutes <= fromTotalMinutes) {
			return fail(400, {
				message: 'Pickup end time must be after start time',
				field: 'pickupTimeUntil'
			});
		}

		// Validate minimum 30-minute pickup window
		const pickupWindowMinutes = untilTotalMinutes - fromTotalMinutes;
		if (pickupWindowMinutes < 30) {
			return fail(400, {
				message: 'Pickup window must be at least 30 minutes',
				field: 'pickupTimeUntil'
			});
		}

		// Handle validUntil - only for non-recurring offers
		let validUntil: Date | null = null;
		if (isRecurring) {
			if (validUntilStr && validUntilStr.trim() !== '') {
				validUntil = new Date(validUntilStr);
				if (isNaN(validUntil.getTime())) {
					return fail(400, { message: 'Invalid expiration date', field: 'validUntil' });
				}

				// Ensure validUntil is in the future
				const now = new Date();
				now.setHours(0, 0, 0, 0); // Start of today
				if (validUntil < now) {
					return fail(400, {
						message: 'Expiration date must be today or in the future',
						field: 'validUntil'
					});
				}
			} else {
				// Default to tomorrow if not provided
				validUntil = new Date();
				validUntil.setDate(validUntil.getDate() + 1);
				validUntil.setHours(23, 59, 59, 999); // End of tomorrow
			}
		}

		// Validate locationId if provided (empty string means all locations)
		if (locationId && locationId !== '') {
			const location = await db
				.select({ id: businessLocations.id })
				.from(businessLocations)
				.where(eq(businessLocations.id, locationId))
				.limit(1);

			if (location.length === 0) {
				return fail(400, { message: 'Invalid location', field: 'locationId' });
			}
		}

		// Upload the offer image
		const imageUploadResult = await uploadImageWithPreset(offerImageFile, 'offerImage');

		if (!imageUploadResult.success) {
			return fail(500, {
				message: imageUploadResult.error || 'Failed to upload offer image',
				field: 'offerImage'
			});
		}

		// Create file record for the uploaded image
		const imageFileId = randomUUID();
		try {
			await db.insert(files).values({
				id: imageFileId,
				key: imageUploadResult.key,
				fileName: offerImageFile.name,
				contentType: offerImageFile.type,
				sizeBytes: offerImageFile.size,
				uploadedBy: account.id
			});
		} catch (e) {
			console.error('Failed to create file record:', e);
			return fail(500, { message: 'Failed to save image information' });
		}

		try {
			// Convert time strings to proper format (HH:MM:SS)
			const pickupTimeFromFormatted = `${pickupTimeFrom}:00`;
			const pickupTimeUntilFormatted = `${pickupTimeUntil}:00`;

			const offerId = randomUUID();

			// Insert offer
			await db.insert(businessOffers).values({
				id: offerId,
				businessAccountId: account.id,
				locationId: locationId && locationId !== '' ? locationId : null,
				imageId: imageFileId,
				name: name.trim(),
				description: description.trim(),
				originalValue,
				price,
				currency: currency,

				quantity,
				isActive: true,
				isRecurring,
				pickupTimeFrom: pickupTimeFromFormatted,
				pickupTimeUntil: pickupTimeUntilFormatted,
				validUntil: validUntil
			});

			// Send notifications to subscribers if this is a location-specific offer
			if (locationId && locationId !== '') {
				// Fire and forget - don't wait for notifications to complete
				notifyNewOffer(locationId, name.trim(), price, currency.trim(), offerId).catch((err) => {
					console.error('Failed to send notifications:', err);
				});
			}
		} catch (e) {
			console.error('Failed to create offer:', e);
			return fail(500, { message: 'Failed to create offer' });
		}

		throw redirect(303, '/offers');
	}
} satisfies Actions;
