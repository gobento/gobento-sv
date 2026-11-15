// src/routes/(dock)/business/[id]/+page.server.ts
/** A business and all of its locations, e.g. reached from one of its location pages. */
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db.js';
import { businessLocations, businessOffers, businessProfiles, files } from '#lib/server/schema.js';
import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { getSignedDownloadUrl } from '#lib/server/backblaze.js';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const account = locals.account!;

	const [business] = await db
		.select({
			accountId: businessProfiles.accountId,
			name: businessProfiles.name,
			description: businessProfiles.description,
			businessType: businessProfiles.businessType,
			country: businessProfiles.country,
			logoKey: files.key
		})
		.from(businessProfiles)
		.leftJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.where(eq(businessProfiles.accountId, params.id))
		.limit(1);

	// Same visibility as the business's location pages, which link here.
	if (!business) throw error(404, 'Business not found');
	const isOwner = business.accountId === account.id;

	const now = new Date();
	const rows = await db
		.select({
			id: businessLocations.id,
			name: businessLocations.name,
			address: businessLocations.address,
			city: businessLocations.city,
			zipCode: businessLocations.zipCode,
			imageKey: files.key,
			activeOffers: sql<number>`count(${businessOffers.id})::int`
		})
		.from(businessLocations)
		.leftJoin(files, eq(businessLocations.imageId, files.id))
		.leftJoin(
			businessOffers,
			and(
				eq(businessOffers.locationId, businessLocations.id),
				eq(businessOffers.isActive, true),
				or(isNull(businessOffers.validUntil), gt(businessOffers.validUntil, now))
			)
		)
		.where(eq(businessLocations.businessAccountId, business.accountId))
		.groupBy(businessLocations.id, files.key)
		.orderBy(businessLocations.city, businessLocations.name);

	const locations = await Promise.all(
		rows.map(async ({ imageKey, ...location }) => ({
			...location,
			imageUrl: imageKey ? await getSignedDownloadUrl(imageKey) : null
		}))
	);

	const { logoKey, ...profile } = business;
	return {
		business: { ...profile, logoUrl: logoKey ? await getSignedDownloadUrl(logoKey) : null },
		locations,
		isOwner,
		// The location the visitor came from, to mark it in the list.
		fromLocationId: url.searchParams.get('from')
	};
};
