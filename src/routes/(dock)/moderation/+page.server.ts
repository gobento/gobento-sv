// src/routes/(dock)/moderation/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { accounts, businessProfiles, charityProfiles, files } from '$lib/server/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { getSignedDownloadUrl } from '$lib/server/backblaze';

// Accounts allowed to review new businesses and charities
const MODERATOR_TYPES = ['moderator', 'admin'] as const;

function assertModerator(accountType: string) {
	if (!MODERATOR_TYPES.includes(accountType as (typeof MODERATOR_TYPES)[number])) {
		throw error(403, 'This page is only accessible by moderators');
	}
}

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;
	assertModerator(account.accountType);

	// Pending items sort before reviewed ones ('pending' < 'rejected'/'verified')
	const businessRows = await db
		.select({
			profile: businessProfiles,
			email: accounts.email,
			registeredAt: accounts.createdAt,
			pictureKey: files.key
		})
		.from(businessProfiles)
		.innerJoin(accounts, eq(businessProfiles.accountId, accounts.id))
		.leftJoin(files, eq(businessProfiles.profilePictureId, files.id))
		.orderBy(asc(businessProfiles.verificationStatus), desc(accounts.createdAt));

	const charityRows = await db
		.select({
			profile: charityProfiles,
			email: accounts.email,
			registeredAt: accounts.createdAt,
			pictureKey: files.key
		})
		.from(charityProfiles)
		.innerJoin(accounts, eq(charityProfiles.accountId, accounts.id))
		.leftJoin(files, eq(charityProfiles.profilePictureId, files.id))
		.orderBy(asc(charityProfiles.verificationStatus), desc(accounts.createdAt));

	const businesses = await Promise.all(
		businessRows.map(async (row) => ({
			kind: 'business' as const,
			accountId: row.profile.accountId,
			name: row.profile.name,
			description: row.profile.description,
			country: row.profile.country,
			email: row.email,
			registeredAt: row.registeredAt,
			status: row.profile.verificationStatus,
			notes: row.profile.verificationNotes,
			verifiedAt: row.profile.verifiedAt,
			businessType: row.profile.businessType,
			registrationNumber: null as string | null,
			contactEmail: null as string | null,
			pictureUrl: row.pictureKey ? await getSignedDownloadUrl(row.pictureKey) : null
		}))
	);

	const charities = await Promise.all(
		charityRows.map(async (row) => ({
			kind: 'charity' as const,
			accountId: row.profile.accountId,
			name: row.profile.name,
			description: row.profile.description,
			country: row.profile.country,
			email: row.email,
			registeredAt: row.registeredAt,
			status: row.profile.verificationStatus,
			notes: row.profile.verificationNotes,
			verifiedAt: row.profile.verifiedAt,
			businessType: null as string | null,
			registrationNumber: row.profile.registrationNumber,
			contactEmail: row.profile.contactEmail,
			pictureUrl: row.pictureKey ? await getSignedDownloadUrl(row.pictureKey) : null
		}))
	);

	const items = [...businesses, ...charities];

	return {
		items,
		pendingCount: items.filter((item) => item.status === 'pending').length
	};
};

const parseReview = async (request: Request) => {
	const formData = await request.formData();
	const kind = formData.get('kind')?.toString() as 'business' | 'charity' | undefined;
	const accountId = formData.get('accountId')?.toString();
	const notes = formData.get('notes')?.toString().trim() || null;

	if (kind !== 'business' && kind !== 'charity') {
		return { error: 'Invalid account kind' as const };
	}
	if (!accountId) {
		return { error: 'Missing account reference' as const };
	}
	return { kind, accountId, notes };
};

async function updateVerification(
	kind: 'business' | 'charity',
	accountId: string,
	moderatorId: string,
	status: 'verified' | 'rejected',
	notes: string | null
) {
	const values = {
		verificationStatus: status,
		verificationNotes: notes,
		verifiedAt: new Date(),
		verifiedByAccountId: moderatorId
	};

	if (kind === 'business') {
		await db.update(businessProfiles).set(values).where(eq(businessProfiles.accountId, accountId));
	} else {
		await db.update(charityProfiles).set(values).where(eq(charityProfiles.accountId, accountId));
	}
}

export const actions: Actions = {
	approve: async ({ locals, request }) => {
		const account = locals.account!;
		assertModerator(account.accountType);

		const parsed = await parseReview(request);
		if ('error' in parsed) {
			return fail(400, { error: parsed.error });
		}

		await updateVerification(parsed.kind, parsed.accountId, account.id, 'verified', parsed.notes);
		return { success: true };
	},
	reject: async ({ locals, request }) => {
		const account = locals.account!;
		assertModerator(account.accountType);

		const parsed = await parseReview(request);
		if ('error' in parsed) {
			return fail(400, { error: parsed.error });
		}

		await updateVerification(parsed.kind, parsed.accountId, account.id, 'rejected', parsed.notes);
		return { success: true };
	}
};
