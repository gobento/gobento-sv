// src/routes/(dock)/team/+page.server.ts
/**
 * Staff management for business and charity owners. A staff account is a
 * low access level: it can only open the Shift page (business staff for
 * one location). Staff sign in with Google using the email added here.
 */
import type { PageServerLoad, Actions } from './$types';
import { db } from '#lib/server/db.js';
import { accounts, businessLocations, employees, sessions } from '#lib/server/schema.js';
import { and, eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

function requireOwner(locals: App.Locals) {
	const account = locals.account!;
	if (account.accountType !== 'business' && account.accountType !== 'charity') {
		throw error(403, 'Only businesses and charities have a team');
	}
	return account as typeof account & { accountType: 'business' | 'charity' };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const load: PageServerLoad = async ({ locals }) => {
	const owner = requireOwner(locals);

	const team = await db
		.select({
			accountId: employees.accountId,
			name: employees.name,
			email: accounts.email,
			locationId: employees.locationId,
			locationName: businessLocations.name,
			createdAt: employees.createdAt
		})
		.from(employees)
		.innerJoin(accounts, eq(employees.accountId, accounts.id))
		.leftJoin(businessLocations, eq(employees.locationId, businessLocations.id))
		.where(eq(employees.employerAccountId, owner.id))
		.orderBy(employees.name);

	const locations =
		owner.accountType === 'business'
			? await db
					.select({ id: businessLocations.id, name: businessLocations.name, city: businessLocations.city })
					.from(businessLocations)
					.where(eq(businessLocations.businessAccountId, owner.id))
					.orderBy(businessLocations.name)
			: [];

	return { team, locations, ownerType: owner.accountType };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const owner = requireOwner(locals);
		const formData = await request.formData();
		const name = String(formData.get('name') ?? '').trim();
		const email = String(formData.get('email') ?? '').trim().toLowerCase();
		const locationIdRaw = String(formData.get('locationId') ?? '');

		if (name.length < 2) return fail(400, { add: { error: 'Enter a name' } });
		if (!EMAIL.test(email)) return fail(400, { add: { error: 'Enter a valid email address' } });

		let locationId: string | null = null;
		if (owner.accountType === 'business') {
			const [location] = await db
				.select({ id: businessLocations.id })
				.from(businessLocations)
				.where(
					and(eq(businessLocations.id, locationIdRaw), eq(businessLocations.businessAccountId, owner.id))
				)
				.limit(1);
			if (!location) return fail(400, { add: { error: 'Choose the location they work at' } });
			locationId = location.id;
		}

		const [existing] = await db
			.select({ id: accounts.id })
			.from(accounts)
			.where(eq(accounts.email, email))
			.limit(1);
		if (existing) {
			// Never turn someone's existing account into staff.
			return fail(400, {
				add: {
					error:
						'This email already has a Go Bento account. Staff need an email that is only used for work here.'
				}
			});
		}

		const accountId = randomUUID();
		await db.transaction(async (tx) => {
			await tx.insert(accounts).values({ id: accountId, email, accountType: 'employee' });
			await tx.insert(employees).values({
				accountId,
				employerAccountId: owner.id,
				locationId,
				name
			});
		});

		return { add: { success: true, email } };
	},

	move: async ({ request, locals }) => {
		const owner = requireOwner(locals);
		if (owner.accountType !== 'business') return fail(400, { team: { error: 'Not available' } });
		const formData = await request.formData();
		const accountId = String(formData.get('accountId') ?? '');
		const locationId = String(formData.get('locationId') ?? '');

		const [location] = await db
			.select({ id: businessLocations.id })
			.from(businessLocations)
			.where(and(eq(businessLocations.id, locationId), eq(businessLocations.businessAccountId, owner.id)))
			.limit(1);
		if (!location) return fail(400, { team: { error: 'Unknown location' } });

		await db
			.update(employees)
			.set({ locationId })
			.where(and(eq(employees.accountId, accountId), eq(employees.employerAccountId, owner.id)));
		return { team: { success: true } };
	},

	remove: async ({ request, locals }) => {
		const owner = requireOwner(locals);
		const accountId = String((await request.formData()).get('accountId') ?? '');

		const [member] = await db
			.select({ accountId: employees.accountId })
			.from(employees)
			.where(and(eq(employees.accountId, accountId), eq(employees.employerAccountId, owner.id)))
			.limit(1);
		if (!member) return fail(404, { team: { error: 'Team member not found' } });

		// Deleting the account signs them out everywhere (sessions cascade).
		await db.delete(sessions).where(eq(sessions.accountId, member.accountId));
		await db
			.delete(accounts)
			.where(and(eq(accounts.id, member.accountId), eq(accounts.accountType, 'employee')));
		return { team: { success: true } };
	}
};
