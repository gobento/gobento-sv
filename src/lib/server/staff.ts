// src/lib/server/staff.ts
/**
 * Staff accounts and the counter: who works where, and handing over orders by
 * scanning the customer's signed pickup code (see `#lib/pickupCode`).
 */
import { db } from './db';
import {
	accounts,
	businessOffers,
	businessLocations,
	charityProfiles,
	employees,
	reservations
} from './schema';
import { and, eq } from 'drizzle-orm';
import { TokenBucket } from './rate-limit';
import { checkPickupCode, checkPickupDigits, parsePickupCode } from '#lib/pickupCode.js';

export interface StaffContext {
	accountId: string;
	name: string | null;
	employerAccountId: string;
	employerType: 'business' | 'charity';
	/** Set for business staff (and for an owner who picked a location). */
	locationId: string | null;
	/** True when the employer itself is using the staff view. */
	isOwner: boolean;
}

/** The staff context of a signed-in account, or null if it isn't staff. */
export async function staffContext(account: {
	id: string;
	accountType: string;
}): Promise<StaffContext | null> {
	if (account.accountType === 'business' || account.accountType === 'charity') {
		return {
			accountId: account.id,
			name: null,
			employerAccountId: account.id,
			employerType: account.accountType,
			locationId: null,
			isOwner: true
		};
	}
	if (account.accountType !== 'employee') return null;

	const [row] = await db
		.select({
			name: employees.name,
			employerAccountId: employees.employerAccountId,
			locationId: employees.locationId,
			employerType: accounts.accountType
		})
		.from(employees)
		.innerJoin(accounts, eq(employees.employerAccountId, accounts.id))
		.where(eq(employees.accountId, account.id))
		.limit(1);
	if (!row || (row.employerType !== 'business' && row.employerType !== 'charity')) return null;

	return {
		accountId: account.id,
		name: row.name,
		employerAccountId: row.employerAccountId,
		employerType: row.employerType,
		locationId: row.locationId,
		isOwner: false
	};
}

/** Orders can be handed over from 3 h before until 3 h after their pickup window. */
const EARLY_MS = 3 * 60 * 60 * 1000;
const LATE_MS = 3 * 60 * 60 * 1000;

/**
 * Failed scans per staff account: 10 in a burst, then one every 30 s. Stops
 * anyone from brute-forcing the 6-digit fallback at the counter.
 */
const failures = new TokenBucket<string>(10, 30);

export type RedeemResult =
	| { ok: true; reservationId: string; offerName: string; collector: string }
	| { ok: false; error: string };

export type RedeemInput =
	| { kind: 'qr'; payload: string }
	| { kind: 'digits'; reservationId: string; digits: string };

/**
 * Verifies a pickup code for `locationId` and marks the order as collected.
 * Every check runs on the server against the database; nothing in the code
 * itself is trusted until its signature has been verified.
 */
export async function redeemPickup(
	staff: StaffContext,
	locationId: string,
	input: RedeemInput,
	now = new Date()
): Promise<RedeemResult> {
	if (!failures.check(staff.accountId, 1)) {
		return { ok: false, error: 'Too many failed scans. Wait a minute and try again.' };
	}
	const fail = (error: string): RedeemResult => {
		failures.consume(staff.accountId, 1);
		return { ok: false, error };
	};

	let reservationId: string;
	let parsed = null;
	if (input.kind === 'qr') {
		parsed = parsePickupCode(input.payload);
		if (!parsed) return fail('This is not a Go Bento pickup code.');
		reservationId = parsed.reservationId;
	} else {
		reservationId = input.reservationId;
	}

	const [row] = await db
		.select({
			id: reservations.id,
			status: reservations.status,
			claimToken: reservations.claimToken,
			pickupFrom: reservations.pickupFrom,
			pickupUntil: reservations.pickupUntil,
			userAccountId: reservations.userAccountId,
			offerName: businessOffers.name,
			locationId: businessOffers.locationId,
			businessAccountId: businessOffers.businessAccountId,
			charityName: charityProfiles.name
		})
		.from(reservations)
		.innerJoin(businessOffers, eq(reservations.offerId, businessOffers.id))
		.leftJoin(charityProfiles, eq(reservations.userAccountId, charityProfiles.accountId))
		.where(eq(reservations.id, reservationId))
		.limit(1);

	// Same answer for "doesn't exist" and "bad signature", so a scanner can't
	// probe for reservation ids.
	if (!row) return fail('This code is not valid.');

	if (parsed) {
		const check = await checkPickupCode(parsed, row.claimToken, now.getTime());
		if (check === 'invalid') return fail('This code is not valid.');
		if (check === 'expired') {
			return fail('This code has expired — a screenshot? Ask for the live code in the app.');
		}
	} else if (
		input.kind === 'digits' &&
		!(await checkPickupDigits(input.digits.trim(), row.claimToken, row.id, now.getTime()))
	) {
		return fail('Wrong code. Ask the customer for the 6 digits currently shown in their app.');
	}

	// Genuine code from here on; the remaining checks are about the order.
	if (row.businessAccountId !== staff.employerAccountId || row.locationId !== locationId) {
		return { ok: false, error: 'This order is for a different location.' };
	}
	if (row.status === 'claimed' || row.status === 'completed') {
		return { ok: false, error: 'This order has already been handed over.' };
	}
	if (row.status !== 'active') return { ok: false, error: 'This order is no longer active.' };
	if (now.getTime() < row.pickupFrom.getTime() - EARLY_MS) {
		return { ok: false, error: 'Too early: this order is for a later pickup window.' };
	}
	if (now.getTime() > row.pickupUntil.getTime() + LATE_MS) {
		return { ok: false, error: 'The pickup window for this order has passed.' };
	}

	// Atomic: of two simultaneous scans of the same code only one wins.
	const updated = await db
		.update(reservations)
		.set({ status: 'claimed', claimedAt: now, claimedBy: row.userAccountId })
		.where(and(eq(reservations.id, row.id), eq(reservations.status, 'active')))
		.returning({ id: reservations.id });
	if (updated.length === 0) {
		return { ok: false, error: 'This order has already been handed over.' };
	}

	return {
		ok: true,
		reservationId: row.id,
		offerName: row.offerName,
		collector: row.charityName ?? 'Customer'
	};
}

/** The location a business staff member or owner works at. */
export async function locationFor(staff: StaffContext, requested: string | null) {
	const id = staff.isOwner ? requested : staff.locationId;
	const locations = await db
		.select({
			id: businessLocations.id,
			name: businessLocations.name,
			address: businessLocations.address,
			city: businessLocations.city
		})
		.from(businessLocations)
		.where(eq(businessLocations.businessAccountId, staff.employerAccountId))
		.orderBy(businessLocations.name);
	const location = locations.find((l) => l.id === id) ?? (staff.isOwner ? locations[0] : undefined);
	return { location: location ?? null, locations: staff.isOwner ? locations : [] };
}
