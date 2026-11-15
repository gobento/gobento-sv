import { db } from '#lib/server/db.js';
import {
	reservations,
	businessOffers,
	businessLocations,
	businessProfiles,
	files
} from '#lib/server/schema.js';
import { eq, and, desc, lt } from 'drizzle-orm';
import { priceWithMargin } from '#lib/server/payments/currency.js';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getSignedDownloadUrl } from '#lib/server/backblaze.js';
import { getReservationReceipt } from '#lib/server/pdf/getReservationReceipt.js';

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;
	if (account.accountType !== 'user' && account.accountType !== 'charity') {
		throw error(403, 'Only user and charity accounts can access reservations');
	}

	// A missed pickup stays "active" until someone looks at it; settle those
	// first so the list never shows an order as upcoming after its window closed.
	await db
		.update(reservations)
		.set({ status: 'expired' })
		.where(
			and(
				eq(reservations.userAccountId, account.id),
				eq(reservations.status, 'active'),
				lt(reservations.pickupUntil, new Date())
			)
		);

	const rows = await db
		.select({
			id: reservations.id,
			status: reservations.status,
			pickupFrom: reservations.pickupFrom,
			pickupUntil: reservations.pickupUntil,
			offerName: businessOffers.name,
			price: businessOffers.price,
			currency: businessOffers.currency,
			locationName: businessLocations.name,
			city: businessLocations.city,
			businessName: businessProfiles.name,
			logoKey: files.key
		})
		.from(reservations)
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.leftJoin(businessLocations, eq(businessOffers.locationId, businessLocations.id))
		.innerJoin(businessProfiles, eq(businessOffers.businessAccountId, businessProfiles.accountId))
		.leftJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.where(eq(reservations.userAccountId, account.id))
		.orderBy(desc(reservations.pickupFrom));

	// Many orders share a business, so sign each logo only once.
	const logoKeys = [...new Set(rows.map((row) => row.logoKey).filter((key) => key !== null))];
	const logoUrls = new Map(
		await Promise.all(logoKeys.map(async (key) => [key, await getSignedDownloadUrl(key)] as const))
	);

	const isCharity = account.accountType === 'charity';

	return {
		isCharity,
		reservations: rows.map(({ logoKey, price, ...row }) => ({
			...row,
			// Charities reserve donated bags; only customers pay.
			price: isCharity ? null : priceWithMargin(price),
			logoUrl: logoKey ? (logoUrls.get(logoKey) ?? null) : null
		}))
	};
};

export const actions: Actions = {
	downloadReceipt: async ({ request, locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const reservationId = formData.get('reservationId');

		if (typeof reservationId !== 'string' || !reservationId) {
			return fail(400, { error: 'Reservation ID is required' });
		}

		const result = await getReservationReceipt(reservationId, session.accountId);

		if (!result.ok) {
			return fail(result.status, { error: result.message });
		}

		return {
			success: true,
			receipt: { base64: result.base64, filename: result.filename }
		};
	}
};
