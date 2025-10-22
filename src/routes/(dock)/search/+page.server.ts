// src/routes/(dock)/search/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { businessOffers, businessProfiles, files, accounts } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	// Fetch all active offers with business details
	const offers = await db
		.select({
			offer: businessOffers,
			business: businessProfiles,
			businessAccount: accounts,
			logo: files
		})
		.from(businessOffers)
		.innerJoin(accounts, eq(businessOffers.businessAccountId, accounts.id))
		.innerJoin(businessProfiles, eq(accounts.id, businessProfiles.accountId))
		.innerJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.where(eq(businessOffers.isActive, true))
		.orderBy(businessOffers.createdAt);

	return {
		offers: offers.map(({ offer, business, logo }) => ({
			id: offer.id,
			name: offer.name,
			description: offer.description,
			price: offer.price,
			currency: offer.currency,
			isRecurring: offer.isRecurring,
			validUntil: offer.validUntil,
			business: {
				name: business.name,
				logo: {
					id: logo.id,
					key: logo.key,
					fileName: logo.fileName
				}
			}
		}))
	};
};
