// src/routes/(dock)/locations/new/+page.server.ts
import { db } from '$lib/server/db';
import { businessLocations, businessProfiles } from '$lib/server/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const account = locals.account;

	if (!session || !account) {
		throw error(401, 'Unauthorized');
	}

	if (account.accountType !== 'business') {
		throw error(403, 'Only business accounts can create locations');
	}

	// Fetch business profile to get country
	const [businessProfile] = await db
		.select()
		.from(businessProfiles)
		.where(eq(businessProfiles.accountId, account.id))
		.limit(1);

	if (!businessProfile) {
		throw error(404, 'Business profile not found');
	}

	return {
		businessCountry: businessProfile.country
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
			return fail(403, { message: 'Only business accounts can create locations' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const address = formData.get('address') as string;
		const city = formData.get('city') as string;
		const state = formData.get('state') as string;
		const zipCode = formData.get('zipCode') as string;
		const country = formData.get('country') as string;
		const latitude = parseFloat(formData.get('latitude') as string);
		const longitude = parseFloat(formData.get('longitude') as string);

		// Validation
		if (!name || name.trim().length === 0) {
			return fail(400, { message: 'Location name is required', field: 'name' });
		}

		if (!address || address.trim().length === 0) {
			return fail(400, { message: 'Address is required', field: 'address' });
		}

		if (!zipCode || zipCode.trim().length === 0) {
			return fail(400, { message: 'ZIP/Postal code is required', field: 'zipCode' });
		}

		if (!city || city.trim().length === 0) {
			return fail(400, { message: 'City is required', field: 'city' });
		}

		if (!country || country.trim().length === 0) {
			return fail(400, { message: 'Country is required', field: 'country' });
		}

		if (isNaN(latitude) || latitude < -90 || latitude > 90) {
			return fail(400, { message: 'Valid latitude is required (-90 to 90)', field: 'latitude' });
		}

		if (isNaN(longitude) || longitude < -180 || longitude > 180) {
			return fail(400, {
				message: 'Valid longitude is required (-180 to 180)',
				field: 'longitude'
			});
		}

		try {
			// Insert location
			await db.insert(businessLocations).values({
				id: randomUUID(),
				businessAccountId: account.id,
				name: name.trim(),
				address: address.trim(),
				city: city.trim(),
				state: state?.trim() || null,
				zipCode: zipCode.trim(),
				country: country.trim(),
				latitude,
				longitude
			});
		} catch (e) {
			console.error('Failed to create location:', e);
			return fail(500, { message: 'Failed to create location' });
		}

		throw redirect(303, '/locations');
	}
} satisfies Actions;
