// src/routes/(dock)/complaints/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { complaints, businessOffers, businessLocations, accounts } from '$lib/server/schema';
import { and, asc, desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'business') {
		throw error(403, 'This page is only accessible by business accounts');
	}

	const rows = await db
		.select({
			complaint: complaints,
			offerName: businessOffers.name,
			locationName: businessLocations.name,
			reporterEmail: accounts.email
		})
		.from(complaints)
		.leftJoin(businessOffers, eq(complaints.offerId, businessOffers.id))
		.leftJoin(businessLocations, eq(complaints.locationId, businessLocations.id))
		.innerJoin(accounts, eq(complaints.reporterAccountId, accounts.id))
		.where(eq(complaints.businessAccountId, account.id))
		// 'open' sorts before 'resolved' alphabetically, so open complaints come first
		.orderBy(asc(complaints.status), desc(complaints.createdAt));

	const items = rows.map((row) => ({
		id: row.complaint.id,
		targetType: row.complaint.targetType,
		targetName: row.offerName ?? row.locationName ?? 'Unknown',
		offerId: row.complaint.offerId,
		locationId: row.complaint.locationId,
		category: row.complaint.category,
		message: row.complaint.message,
		status: row.complaint.status,
		resolutionNote: row.complaint.resolutionNote,
		reporterEmail: row.reporterEmail,
		createdAt: row.complaint.createdAt,
		resolvedAt: row.complaint.resolvedAt
	}));

	return {
		complaints: items,
		openCount: items.filter((c) => c.status === 'open').length
	};
};

export const actions: Actions = {
	resolveComplaint: async ({ locals, request }) => {
		const account = locals.account!;

		if (account.accountType !== 'business') {
			return fail(403, { error: 'Only business accounts can resolve complaints' });
		}

		const formData = await request.formData();
		const complaintId = formData.get('complaintId')?.toString();
		const resolutionNote = formData.get('resolutionNote')?.toString().trim() || null;

		if (!complaintId) {
			return fail(400, { error: 'Missing complaint reference' });
		}

		const [existing] = await db
			.select()
			.from(complaints)
			.where(and(eq(complaints.id, complaintId), eq(complaints.businessAccountId, account.id)))
			.limit(1);

		if (!existing) {
			return fail(404, { error: 'Complaint not found' });
		}

		if (existing.status === 'resolved') {
			return { resolved: true };
		}

		await db
			.update(complaints)
			.set({
				status: 'resolved',
				resolvedAt: new Date(),
				resolvedByAccountId: account.id,
				resolutionNote
			})
			.where(eq(complaints.id, complaintId));

		return { resolved: true };
	}
};
