// src/routes/(dock)/offers/new/+page.server.ts
import { db } from '$lib/server/db';
import { businessLocations, businessOffers } from '$lib/server/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = locals.session;
	const account = locals.account;

	if (!session || !account) {
		throw error(401, 'Unauthorized');
	}

	if (account.accountType !== 'business') {
		throw error(403, 'Only business accounts can create offers');
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
			state: businessLocations.state
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

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const price = parseFloat(formData.get('price') as string);
		const currency = formData.get('currency') as string;
		const locationId = formData.get('locationId') as string;
		const isRecurring = formData.get('isRecurring') === 'on';
		const validUntilStr = formData.get('validUntil') as string;
		const pickupTimeFrom = formData.get('pickupTimeFrom') as string;
		const pickupTimeUntil = formData.get('pickupTimeUntil') as string;

		// Validation
		if (!name || name.trim().length === 0) {
			return fail(400, { message: 'Offer name is required', field: 'name' });
		}

		if (!description || description.trim().length === 0) {
			return fail(400, { message: 'Description is required', field: 'description' });
		}

		if (isNaN(price) || price < 0) {
			return fail(400, { message: 'Valid price is required', field: 'price' });
		}

		if (!currency || currency.trim().length === 0) {
			return fail(400, { message: 'Currency is required', field: 'currency' });
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

		if (untilTotalMinutes <= fromTotalMinutes) {
			return fail(400, {
				message: 'Pickup end time must be after start time',
				field: 'pickupTimeUntil'
			});
		}

		// Parse validUntil if provided
		let validUntil: Date | null = null;
		if (validUntilStr && validUntilStr.trim() !== '') {
			validUntil = new Date(validUntilStr);
			if (isNaN(validUntil.getTime())) {
				return fail(400, { message: 'Invalid expiration date', field: 'validUntil' });
			}
			if (validUntil < new Date()) {
				return fail(400, {
					message: 'Expiration date must be in the future',
					field: 'validUntil'
				});
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

		try {
			// Convert time strings to proper format (HH:MM:SS)
			const pickupTimeFromFormatted = `${pickupTimeFrom}:00`;
			const pickupTimeUntilFormatted = `${pickupTimeUntil}:00`;

			// Insert offer
			await db.insert(businessOffers).values({
				id: randomUUID(),
				businessAccountId: account.id,
				locationId: locationId && locationId !== '' ? locationId : null,
				name: name.trim(),
				description: description.trim(),
				price,
				currency: currency.trim(),
				isActive: true,
				isRecurring,
				validUntil,
				pickupTimeFrom: pickupTimeFromFormatted,
				pickupTimeUntil: pickupTimeUntilFormatted
			});
		} catch (e) {
			console.error('Failed to create offer:', e);
			return fail(500, { message: 'Failed to create offer' });
		}

		throw redirect(303, '/offers');
	}
} satisfies Actions;
