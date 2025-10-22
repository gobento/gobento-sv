// src/routes/(dock)/locations/[id]/+page.server.ts
import { db } from '$lib/server/db';
import { businessLocations, businessOffers } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = locals.session;
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	// Fetch the location
	const location = await db
		.select()
		.from(businessLocations)
		.where(
			and(
				eq(businessLocations.id, params.id),
				eq(businessLocations.businessAccountId, session.accountId)
			)
		)
		.limit(1);

	if (location.length === 0) {
		throw error(404, 'Location not found');
	}

	// Fetch all offers for this location
	const offers = await db
		.select()
		.from(businessOffers)
		.where(
			and(
				eq(businessOffers.locationId, params.id),
				eq(businessOffers.businessAccountId, session.accountId)
			)
		)
		.orderBy(businessOffers.createdAt);

	return {
		location: location[0],
		offers
	};
};
