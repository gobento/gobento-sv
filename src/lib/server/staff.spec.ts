// src/lib/server/staff.spec.ts
// Runs against the seeded in-process database (see vitest.config.ts).
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { reservations } from './schema';
import { DEMO_ACCOUNTS } from './mock/demo-accounts';
import { locationFor, redeemPickup, staffContext, type StaffContext } from './staff';
import { createPickupCode, pickupDigits } from '#lib/pickupCode.js';

const HOUR = 60 * 60 * 1000;
const KREUZBERG = 'loc-kiez-kreuzberg';
const PRENZLAUER = 'loc-kiez-prenzlauer';

/** A fresh order for the demo business's Kreuzberg pastry bag. */
async function order(options: { from?: number; status?: 'active' | 'expired' } = {}) {
	const now = Date.now();
	const id = randomUUID();
	const claimToken = randomUUID();
	await db.insert(reservations).values({
		id,
		offerId: 'offer-pastry-bag',
		userAccountId: DEMO_ACCOUNTS.user,
		status: options.status ?? 'active',
		pickupFrom: new Date(now + (options.from ?? 0)),
		pickupUntil: new Date(now + (options.from ?? 0) + HOUR),
		claimToken
	});
	return { id, claimToken };
}

async function statusOf(id: string) {
	const [row] = await db
		.select({ status: reservations.status, claimedBy: reservations.claimedBy })
		.from(reservations)
		.where(eq(reservations.id, id));
	return row;
}

/** Each test gets its own scanner so failed scans don't share a rate limit. */
async function staff(): Promise<StaffContext> {
	const context = await staffContext({ id: DEMO_ACCOUNTS.staff, accountType: 'employee' });
	if (!context) throw new Error('demo staff account is missing');
	return { ...context, accountId: `${context.accountId}-${randomUUID()}` };
}

describe('staffContext', () => {
	it('places business staff at their location', async () => {
		const context = await staffContext({ id: DEMO_ACCOUNTS.staff, accountType: 'employee' });
		expect(context).toMatchObject({
			employerAccountId: DEMO_ACCOUNTS.business,
			employerType: 'business',
			locationId: KREUZBERG,
			isOwner: false
		});
	});

	it('lets owners use the staff view and turns everyone else away', async () => {
		expect(
			await staffContext({ id: DEMO_ACCOUNTS.business, accountType: 'business' })
		).toMatchObject({ isOwner: true, employerAccountId: DEMO_ACCOUNTS.business });
		expect(await staffContext({ id: DEMO_ACCOUNTS.user, accountType: 'user' })).toBeNull();
		expect(await staffContext({ id: 'nobody', accountType: 'employee' })).toBeNull();
	});

	it('pins staff to their location but lets owners switch', async () => {
		const employee = await staff();
		const pinned = await locationFor(employee, PRENZLAUER);
		expect(pinned.location?.id).toBe(KREUZBERG);
		expect(pinned.locations).toEqual([]);

		const owner = await staffContext({ id: DEMO_ACCOUNTS.business, accountType: 'business' });
		const chosen = await locationFor(owner!, PRENZLAUER);
		expect(chosen.location?.id).toBe(PRENZLAUER);
		expect(chosen.locations.map((l) => l.id)).toContain(KREUZBERG);
	});
});

describe('redeemPickup', () => {
	it('hands over an order for a live QR code exactly once', async () => {
		const { id, claimToken } = await order();
		const scanner = await staff();
		const payload = await createPickupCode(claimToken, id, Date.now());

		const first = await redeemPickup(scanner, KREUZBERG, { kind: 'qr', payload });
		expect(first).toMatchObject({ ok: true, reservationId: id, collector: 'Customer' });
		expect(await statusOf(id)).toEqual({ status: 'claimed', claimedBy: DEMO_ACCOUNTS.user });

		const again = await redeemPickup(scanner, KREUZBERG, { kind: 'qr', payload });
		expect(again).toEqual({ ok: false, error: 'This order has already been handed over.' });
	});

	it('lets only one of two simultaneous scans win', async () => {
		const { id, claimToken } = await order();
		const payload = await createPickupCode(claimToken, id, Date.now());
		const results = await Promise.all([
			redeemPickup(await staff(), KREUZBERG, { kind: 'qr', payload }),
			redeemPickup(await staff(), KREUZBERG, { kind: 'qr', payload })
		]);
		expect(results.filter((r) => r.ok)).toHaveLength(1);
	});

	it('accepts the six digits shown in the app', async () => {
		const { id, claimToken } = await order();
		const digits = await pickupDigits(claimToken, id, Date.now());
		const result = await redeemPickup(await staff(), KREUZBERG, {
			kind: 'digits',
			reservationId: id,
			digits
		});
		expect(result.ok).toBe(true);
	});

	it('rejects wrong digits, foreign codes and forged signatures alike', async () => {
		const { id, claimToken } = await order();
		const scanner = await staff();
		const wrong = await redeemPickup(scanner, KREUZBERG, {
			kind: 'digits',
			reservationId: id,
			digits: '000000'
		});
		expect(wrong.ok).toBe(false);

		expect(
			await redeemPickup(scanner, KREUZBERG, { kind: 'qr', payload: 'https://example.com' })
		).toEqual({ ok: false, error: 'This is not a Go Bento pickup code.' });

		const forged = await createPickupCode('not-the-token', id, Date.now());
		const unknown = await createPickupCode(claimToken, 'no-such-order', Date.now());
		const forgedResult = await redeemPickup(scanner, KREUZBERG, { kind: 'qr', payload: forged });
		const unknownResult = await redeemPickup(scanner, KREUZBERG, { kind: 'qr', payload: unknown });
		// Same message, so ids can't be probed.
		expect(forgedResult).toEqual(unknownResult);
		expect(forgedResult).toEqual({ ok: false, error: 'This code is not valid.' });
		expect((await statusOf(id)).status).toBe('active');
	});

	it('refuses a screenshot of an old code', async () => {
		const { id, claimToken } = await order();
		const payload = await createPickupCode(claimToken, id, Date.now() - 10 * 60 * 1000);
		const result = await redeemPickup(await staff(), KREUZBERG, { kind: 'qr', payload });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/expired/);
	});

	it('only hands over at the right location, inside the pickup window, for active orders', async () => {
		const here = await order();
		const atOtherShop = await redeemPickup(await staff(), PRENZLAUER, {
			kind: 'qr',
			payload: await createPickupCode(here.claimToken, here.id, Date.now())
		});
		expect(atOtherShop).toEqual({ ok: false, error: 'This order is for a different location.' });

		const tomorrow = await order({ from: 24 * HOUR });
		const early = await redeemPickup(await staff(), KREUZBERG, {
			kind: 'qr',
			payload: await createPickupCode(tomorrow.claimToken, tomorrow.id, Date.now())
		});
		expect(early.ok).toBe(false);
		if (!early.ok) expect(early.error).toMatch(/Too early/);

		const yesterday = await order({ from: -24 * HOUR });
		const late = await redeemPickup(await staff(), KREUZBERG, {
			kind: 'qr',
			payload: await createPickupCode(yesterday.claimToken, yesterday.id, Date.now())
		});
		expect(late.ok).toBe(false);
		if (!late.ok) expect(late.error).toMatch(/window .* has passed/);

		const expired = await order({ status: 'expired' });
		const inactive = await redeemPickup(await staff(), KREUZBERG, {
			kind: 'qr',
			payload: await createPickupCode(expired.claimToken, expired.id, Date.now())
		});
		expect(inactive).toEqual({ ok: false, error: 'This order is no longer active.' });
	});

	it('locks a scanner out after a burst of failed scans', async () => {
		const scanner = await staff();
		const { id } = await order();
		for (let i = 0; i < 10; i++) {
			await redeemPickup(scanner, KREUZBERG, { kind: 'digits', reservationId: id, digits: '1' });
		}
		const blocked = await redeemPickup(scanner, KREUZBERG, {
			kind: 'digits',
			reservationId: id,
			digits: '123456'
		});
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) expect(blocked.error).toMatch(/Too many failed scans/);
	});
});
