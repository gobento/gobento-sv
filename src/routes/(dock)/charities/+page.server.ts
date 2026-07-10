// src/routes/(dock)/charities/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	accounts,
	charityProfiles,
	charityFoodPreferences,
	businessLocations,
	businessOffers,
	pickupRequests,
	files
} from '$lib/server/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { getSignedDownloadUrl } from '$lib/server/backblaze';
import { isFoodType, type FoodType } from '$lib/foodTypes';
import { notifyAccount } from '$lib/server/notifications';
import { randomUUID } from 'crypto';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals, url }) => {
	const account = locals.account!;

	if (account.accountType !== 'business') {
		throw error(403, 'Only business accounts can search for charities');
	}

	const foodTypeParam = url.searchParams.get('foodType');
	const foodType: FoodType | null = isFoodType(foodTypeParam) ? foodTypeParam : null;
	const country = url.searchParams.get('country')?.trim() || null;

	// Fetch all verified charities with their logo + contact details
	const charityRows = await db
		.select({
			accountId: charityProfiles.accountId,
			name: charityProfiles.name,
			description: charityProfiles.description,
			country: charityProfiles.country,
			contactEmail: charityProfiles.contactEmail,
			logoKey: files.key
		})
		.from(charityProfiles)
		.innerJoin(accounts, eq(charityProfiles.accountId, accounts.id))
		.innerJoin(files, eq(charityProfiles.profilePictureId, files.id))
		.where(eq(charityProfiles.verificationStatus, 'verified'));

	const charityIds = charityRows.map((row) => row.accountId);

	// Load all food preferences for the returned charities in one query
	const preferenceRows = charityIds.length
		? await db
				.select()
				.from(charityFoodPreferences)
				.where(inArray(charityFoodPreferences.charityAccountId, charityIds))
		: [];

	const preferencesByCharity = new Map<string, FoodType[]>();
	for (const row of preferenceRows) {
		const list = preferencesByCharity.get(row.charityAccountId) ?? [];
		list.push(row.foodType as FoodType);
		preferencesByCharity.set(row.charityAccountId, list);
	}

	// Find the most recent request this business already sent to each charity
	const existingRequests = charityIds.length
		? await db
				.select({
					charityAccountId: pickupRequests.charityAccountId,
					status: pickupRequests.status,
					createdAt: pickupRequests.createdAt
				})
				.from(pickupRequests)
				.where(
					and(
						eq(pickupRequests.businessAccountId, account.id),
						inArray(pickupRequests.charityAccountId, charityIds)
					)
				)
				.orderBy(desc(pickupRequests.createdAt))
		: [];

	const latestRequestByCharity = new Map<string, string>();
	for (const row of existingRequests) {
		if (!latestRequestByCharity.has(row.charityAccountId)) {
			latestRequestByCharity.set(row.charityAccountId, row.status);
		}
	}

	// Distinct list of countries for the filter UI
	const countries = [...new Set(charityRows.map((row) => row.country))].sort((a, b) =>
		a.localeCompare(b)
	);

	let charities = await Promise.all(
		charityRows.map(async (row) => ({
			accountId: row.accountId,
			name: row.name,
			description: row.description,
			country: row.country,
			contactEmail: row.contactEmail,
			logoUrl: await getSignedDownloadUrl(row.logoKey),
			foodTypes: preferencesByCharity.get(row.accountId) ?? [],
			lastRequestStatus: latestRequestByCharity.get(row.accountId) ?? null
		}))
	);

	// Apply the filters in memory (dataset is small; keeps the query simple)
	if (country) {
		charities = charities.filter((c) => c.country === country);
	}
	if (foodType) {
		const selected = foodType;
		charities = charities.filter((c) => c.foodTypes.includes(selected));
	}

	charities.sort((a, b) => a.name.localeCompare(b.name));

	// The business's own locations + active offers, used to attach a pickup request
	const locations = await db
		.select({
			id: businessLocations.id,
			name: businessLocations.name,
			city: businessLocations.city
		})
		.from(businessLocations)
		.where(eq(businessLocations.businessAccountId, account.id))
		.orderBy(businessLocations.name);

	const offers = await db
		.select({
			id: businessOffers.id,
			name: businessOffers.name,
			locationId: businessOffers.locationId
		})
		.from(businessOffers)
		.where(and(eq(businessOffers.businessAccountId, account.id), eq(businessOffers.isActive, true)))
		.orderBy(businessOffers.name);

	return {
		charities,
		locations,
		offers,
		countries,
		filters: { foodType, country }
	};
};

export const actions: Actions = {
	requestPickup: async ({ request, locals }) => {
		const account = locals.account!;

		if (account.accountType !== 'business') {
			return fail(403, { request: { error: 'Only business accounts can request pickups' } });
		}

		const formData = await request.formData();
		const charityAccountId = formData.get('charityAccountId');
		const message = (formData.get('message') as string | null)?.trim() ?? '';
		const foodTypeRaw = formData.get('foodType');
		const locationIdRaw = formData.get('locationId');
		const offerIdRaw = formData.get('offerId');
		const pickupFromRaw = formData.get('proposedPickupFrom');
		const pickupUntilRaw = formData.get('proposedPickupUntil');

		if (typeof charityAccountId !== 'string' || !charityAccountId) {
			return fail(400, { request: { error: 'A charity is required' } });
		}

		if (message.length < 5) {
			return fail(400, {
				request: { error: 'Please include a short message (at least 5 characters)' }
			});
		}

		// Ensure the target is a verified charity
		const [charity] = await db
			.select({ accountId: charityProfiles.accountId, name: charityProfiles.name })
			.from(charityProfiles)
			.where(
				and(
					eq(charityProfiles.accountId, charityAccountId),
					eq(charityProfiles.verificationStatus, 'verified')
				)
			)
			.limit(1);

		if (!charity) {
			return fail(404, { request: { error: 'Charity not found' } });
		}

		const foodType = isFoodType(foodTypeRaw) ? foodTypeRaw : null;
		const locationId = typeof locationIdRaw === 'string' && locationIdRaw ? locationIdRaw : null;
		const offerId = typeof offerIdRaw === 'string' && offerIdRaw ? offerIdRaw : null;

		const parseDate = (value: FormDataEntryValue | null): Date | null => {
			if (typeof value !== 'string' || !value) return null;
			const date = new Date(value);
			return isNaN(date.getTime()) ? null : date;
		};

		try {
			await db.insert(pickupRequests).values({
				id: randomUUID(),
				businessAccountId: account.id,
				charityAccountId,
				locationId,
				offerId,
				foodType,
				message,
				proposedPickupFrom: parseDate(pickupFromRaw),
				proposedPickupUntil: parseDate(pickupUntilRaw),
				status: 'pending'
			});

			const donationsUrl = `${env.PUBLIC_APP_URL || 'http://localhost:5173'}/donations`;
			await notifyAccount(charityAccountId, {
				title: 'New food pickup request',
				message: `A business would like you to collect surplus food. Tap to review the request.`,
				tags: ['handshake', 'shopping_bags'],
				priority: 'high',
				click: donationsUrl,
				actions: [{ action: 'view', label: 'Review', url: donationsUrl }]
			});

			return { request: { success: true } };
		} catch (err) {
			console.error('Error creating pickup request:', err);
			return fail(500, { request: { error: 'Failed to send request. Please try again.' } });
		}
	}
};
