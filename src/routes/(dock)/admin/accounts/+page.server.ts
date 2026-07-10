// src/routes/(dock)/admin/accounts/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { assertAdmin } from '$lib/server/admin';
import {
	accounts,
	userProfiles,
	businessWallets,
	businessProfiles,
	charityProfiles
} from '$lib/server/schema';
import { desc, eq, ilike } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	assertAdmin(locals.account);

	const q = url.searchParams.get('q')?.trim() ?? '';

	const rows = await db
		.select({
			id: accounts.id,
			email: accounts.email,
			accountType: accounts.accountType,
			createdAt: accounts.createdAt,
			// User payment configuration
			userIban: userProfiles.ibanNumber,
			userIbanEnabled: userProfiles.ibanEnabled,
			userIbanConfirmed: userProfiles.ibanConfirmed,
			userTether: userProfiles.tetherAddress,
			userTetherEnabled: userProfiles.tetherEnabled,
			userTetherConfirmed: userProfiles.tetherConfirmed,
			userPreferred: userProfiles.preferredPaymentMethod,
			// Business wallet configuration
			bizIban: businessWallets.ibanNumber,
			bizIbanEnabled: businessWallets.ibanEnabled,
			bizIbanConfirmed: businessWallets.ibanConfirmed,
			bizTether: businessWallets.tetherAddress,
			bizTetherEnabled: businessWallets.tetherEnabled,
			bizTetherConfirmed: businessWallets.tetherConfirmed,
			bizPreferred: businessWallets.preferredPaymentMethod,
			businessName: businessProfiles.name,
			charityName: charityProfiles.name
		})
		.from(accounts)
		.leftJoin(userProfiles, eq(userProfiles.accountId, accounts.id))
		.leftJoin(businessWallets, eq(businessWallets.accountId, accounts.id))
		.leftJoin(businessProfiles, eq(businessProfiles.accountId, accounts.id))
		.leftJoin(charityProfiles, eq(charityProfiles.accountId, accounts.id))
		.where(q ? ilike(accounts.email, `%${q}%`) : undefined)
		.orderBy(desc(accounts.createdAt))
		.limit(200);

	const accountsList = rows.map((row) => {
		const displayName = row.businessName ?? row.charityName ?? null;

		// Collect the payment methods configured on this account.
		const paymentMethods: Array<{
			method: 'iban' | 'tether';
			value: string;
			enabled: boolean;
			confirmed: boolean;
			preferred: boolean;
		}> = [];

		if (row.accountType === 'user') {
			if (row.userIban) {
				paymentMethods.push({
					method: 'iban',
					value: row.userIban,
					enabled: row.userIbanEnabled ?? false,
					confirmed: row.userIbanConfirmed ?? false,
					preferred: row.userPreferred === 'iban'
				});
			}
			if (row.userTether) {
				paymentMethods.push({
					method: 'tether',
					value: row.userTether,
					enabled: row.userTetherEnabled ?? false,
					confirmed: row.userTetherConfirmed ?? false,
					preferred: row.userPreferred === 'tether'
				});
			}
		} else if (row.accountType === 'business') {
			if (row.bizIban) {
				paymentMethods.push({
					method: 'iban',
					value: row.bizIban,
					enabled: row.bizIbanEnabled ?? false,
					confirmed: row.bizIbanConfirmed ?? false,
					preferred: row.bizPreferred === 'iban'
				});
			}
			if (row.bizTether) {
				paymentMethods.push({
					method: 'tether',
					value: row.bizTether,
					enabled: row.bizTetherEnabled ?? false,
					confirmed: row.bizTetherConfirmed ?? false,
					preferred: row.bizPreferred === 'tether'
				});
			}
		}

		return {
			id: row.id,
			email: row.email,
			accountType: row.accountType,
			createdAt: row.createdAt,
			displayName,
			paymentMethods
		};
	});

	return {
		query: q,
		accounts: accountsList,
		truncated: accountsList.length === 200
	};
};
