// src/routes/(dock)/charities/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { db } from '#lib/server/db.js';
import {
	accounts,
	charityProfiles,
	charityFoodPreferences,
	businessLocations,
	businessOffers,
	pickupRequests,
	recurringGifts,
	files
} from '#lib/server/schema.js';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { getSignedDownloadUrl } from '#lib/server/backblaze.js';
import { isFoodType, type FoodType } from '#lib/foodTypes.js';
import { notifyAccount } from '#lib/server/notifications.js';
import { randomUUID } from 'crypto';
import { PUBLIC_APP_URL } from '$app/env/private';
import {
	isGiftFrequency,
	isValidTimeZone,
	todayIn,
	validateSchedule,
	describeSchedule,
	type GiftSchedule
} from '#lib/recurringGifts.js';
import { firstOccurrenceFrom, materializeDueGifts } from '#lib/server/recurringGifts.js';

const appUrl = (path: string) => `${PUBLIC_APP_URL || 'http://localhost:5173'}${path}`;

/** Loads one of the business's own gifts, or null. */
async function ownGift(businessAccountId: string, giftId: FormDataEntryValue | null) {
	if (typeof giftId !== 'string' || !giftId) return null;
	const [gift] = await db
		.select()
		.from(recurringGifts)
		.where(and(eq(recurringGifts.id, giftId), eq(recurringGifts.businessAccountId, businessAccountId)))
		.limit(1);
	return gift ?? null;
}

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

	// Regular gifts this business has set up, with how often they were delivered
	await materializeDueGifts({ businessAccountId: account.id });
	const giftRows = await db
		.select({
			id: recurringGifts.id,
			charityAccountId: recurringGifts.charityAccountId,
			charityName: charityProfiles.name,
			logoKey: files.key,
			locationName: businessLocations.name,
			foodType: recurringGifts.foodType,
			message: recurringGifts.message,
			frequency: recurringGifts.frequency,
			weekday: recurringGifts.weekday,
			dayOfMonth: recurringGifts.dayOfMonth,
			pickupTimeFrom: recurringGifts.pickupTimeFrom,
			pickupTimeUntil: recurringGifts.pickupTimeUntil,
			status: recurringGifts.status,
			nextOccurrenceAt: recurringGifts.nextOccurrenceAt,
			notes: recurringGifts.notes,
			createdAt: recurringGifts.createdAt,
			pickups: sql<number>`(select count(*)::int from ${pickupRequests} where ${pickupRequests.recurringGiftId} = ${recurringGifts.id} and ${pickupRequests.status} in ('accepted', 'completed'))`
		})
		.from(recurringGifts)
		.innerJoin(charityProfiles, eq(recurringGifts.charityAccountId, charityProfiles.accountId))
		.innerJoin(files, eq(charityProfiles.profilePictureId, files.id))
		.leftJoin(businessLocations, eq(recurringGifts.locationId, businessLocations.id))
		.where(eq(recurringGifts.businessAccountId, account.id))
		.orderBy(desc(recurringGifts.createdAt));

	const gifts = await Promise.all(
		giftRows.map(async ({ logoKey, ...gift }) => ({
			...gift,
			logoUrl: await getSignedDownloadUrl(logoKey),
			schedule: describeSchedule({
				frequency: gift.frequency,
				weekday: gift.weekday,
				dayOfMonth: gift.dayOfMonth,
				timeFrom: gift.pickupTimeFrom,
				timeUntil: gift.pickupTimeUntil
			})
		}))
	);

	const openGiftByCharity = new Map<string, string>();
	for (const gift of gifts) {
		if (['proposed', 'active', 'paused'].includes(gift.status)) {
			openGiftByCharity.set(gift.charityAccountId, gift.status);
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
			lastRequestStatus: latestRequestByCharity.get(row.accountId) ?? null,
			giftStatus: openGiftByCharity.get(row.accountId) ?? null
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
		gifts,
		locations,
		offers,
		countries,
		filters: { foodType, country }
	};
};

export const actions: Actions = {
	proposeGift: async ({ request, locals }) => {
		const account = locals.account!;
		if (account.accountType !== 'business') {
			return fail(403, { gift: { error: 'Only business accounts can give regularly' } });
		}

		const formData = await request.formData();
		const charityAccountId = formData.get('charityAccountId');
		const message = (formData.get('message') as string | null)?.trim() ?? '';
		const frequency = formData.get('frequency');
		const locationIdRaw = formData.get('locationId');
		const foodTypeRaw = formData.get('foodType');
		const timeZoneRaw = formData.get('timeZone');
		const timeZone = isValidTimeZone(timeZoneRaw) ? timeZoneRaw : 'UTC';
		const startsOnRaw = formData.get('startsOn');
		const toInt = (value: FormDataEntryValue | null) =>
			typeof value === 'string' && value !== '' ? Number(value) : null;

		if (typeof charityAccountId !== 'string' || !charityAccountId) {
			return fail(400, { gift: { error: 'A charity is required' } });
		}
		if (!isGiftFrequency(frequency)) {
			return fail(400, { gift: { error: 'Choose how often you want to give' } });
		}
		if (message.length < 5) {
			return fail(400, {
				gift: { error: 'Tell the charity what you usually have (at least 5 characters)' }
			});
		}

		const schedule: GiftSchedule = {
			frequency,
			weekday: frequency === 'monthly' ? null : toInt(formData.get('weekday')),
			dayOfMonth: frequency === 'monthly' ? toInt(formData.get('dayOfMonth')) : null,
			timeFrom: String(formData.get('pickupTimeFrom') ?? ''),
			timeUntil: String(formData.get('pickupTimeUntil') ?? ''),
			timeZone,
			startsOn:
				typeof startsOnRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startsOnRaw)
					? startsOnRaw
					: todayIn(timeZone)
		};
		const invalid = validateSchedule(schedule);
		if (invalid) return fail(400, { gift: { error: invalid } });

		const [charity] = await db
			.select({ accountId: charityProfiles.accountId })
			.from(charityProfiles)
			.where(
				and(
					eq(charityProfiles.accountId, charityAccountId),
					eq(charityProfiles.verificationStatus, 'verified')
				)
			)
			.limit(1);
		if (!charity) return fail(404, { gift: { error: 'Charity not found' } });

		let locationId: string | null = null;
		if (typeof locationIdRaw === 'string' && locationIdRaw) {
			const [location] = await db
				.select({ id: businessLocations.id })
				.from(businessLocations)
				.where(
					and(
						eq(businessLocations.id, locationIdRaw),
						eq(businessLocations.businessAccountId, account.id)
					)
				)
				.limit(1);
			if (!location) return fail(400, { gift: { error: 'Unknown location' } });
			locationId = location.id;
		}

		const [open] = await db
			.select({ id: recurringGifts.id })
			.from(recurringGifts)
			.where(
				and(
					eq(recurringGifts.businessAccountId, account.id),
					eq(recurringGifts.charityAccountId, charityAccountId),
					inArray(recurringGifts.status, ['proposed', 'active', 'paused'])
				)
			)
			.limit(1);
		if (open) {
			return fail(400, {
				gift: { error: 'You already have a regular gift with this charity. End it first to set up a new one.' }
			});
		}

		await db.insert(recurringGifts).values({
			id: randomUUID(),
			businessAccountId: account.id,
			charityAccountId,
			locationId,
			foodType: isFoodType(foodTypeRaw) ? foodTypeRaw : null,
			message,
			frequency,
			weekday: schedule.weekday,
			dayOfMonth: schedule.dayOfMonth,
			pickupTimeFrom: schedule.timeFrom,
			pickupTimeUntil: schedule.timeUntil,
			timeZone,
			startsOn: schedule.startsOn,
			status: 'proposed'
		});

		await notifyAccount(charityAccountId, {
			title: 'A business wants to give regularly',
			message: `${describeSchedule(schedule)}. Tap to review the regular gift.`,
			tags: ['repeat', 'handshake'],
			priority: 'high',
			click: appUrl('/donations'),
			actions: [{ action: 'view', label: 'Review', url: appUrl('/donations') }]
		}).catch((err) => console.error('Failed to notify charity about a gift:', err));

		return { gift: { success: true } };
	},

	pauseGift: async ({ request, locals }) => {
		const account = locals.account!;
		const gift = await ownGift(account.id, (await request.formData()).get('giftId'));
		if (!gift) return fail(404, { giftAction: { error: 'Regular gift not found' } });
		if (gift.status !== 'active') {
			return fail(400, { giftAction: { error: 'Only an active gift can be paused' } });
		}
		await db
			.update(recurringGifts)
			.set({ status: 'paused', nextOccurrenceAt: null })
			.where(eq(recurringGifts.id, gift.id));
		return { giftAction: { success: true } };
	},

	resumeGift: async ({ request, locals }) => {
		const account = locals.account!;
		const gift = await ownGift(account.id, (await request.formData()).get('giftId'));
		if (!gift) return fail(404, { giftAction: { error: 'Regular gift not found' } });
		if (gift.status !== 'paused') {
			return fail(400, { giftAction: { error: 'Only a paused gift can be resumed' } });
		}
		await db
			.update(recurringGifts)
			.set({ status: 'active', nextOccurrenceAt: firstOccurrenceFrom(gift) })
			.where(eq(recurringGifts.id, gift.id));
		await materializeDueGifts({ businessAccountId: account.id });
		return { giftAction: { success: true } };
	},

	endGift: async ({ request, locals }) => {
		const account = locals.account!;
		const gift = await ownGift(account.id, (await request.formData()).get('giftId'));
		if (!gift) return fail(404, { giftAction: { error: 'Regular gift not found' } });
		if (!['proposed', 'active', 'paused'].includes(gift.status)) {
			return fail(400, { giftAction: { error: 'This gift has already ended' } });
		}
		const now = new Date();
		await db
			.update(recurringGifts)
			.set({ status: 'ended', nextOccurrenceAt: null, endedAt: now })
			.where(eq(recurringGifts.id, gift.id));
		// Pickups that are scheduled but not yet due are called off too.
		await db
			.update(pickupRequests)
			.set({ status: 'cancelled' })
			.where(
				and(
					eq(pickupRequests.recurringGiftId, gift.id),
					eq(pickupRequests.status, 'accepted'),
					sql`${pickupRequests.proposedPickupFrom} > ${now}`
				)
			);

		if (gift.status !== 'proposed') {
			await notifyAccount(gift.charityAccountId, {
				title: 'Regular gift ended',
				message: 'A business ended its regular food gift to you.',
				tags: ['x'],
				priority: 'default',
				click: appUrl('/donations')
			}).catch((err) => console.error('Failed to notify charity about a gift:', err));
		}
		return { giftAction: { success: true } };
	},

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

			const donationsUrl = `${PUBLIC_APP_URL || 'http://localhost:5173'}/donations`;
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
