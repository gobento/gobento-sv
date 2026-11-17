// src/lib/server/recurringGifts.spec.ts
// The scheduling job against the seeded in-process database (see vitest.config.ts).
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { pickupRequests, recurringGifts } from './schema';
import { materializeDueGifts } from './recurringGifts';
import { DEMO_ACCOUNTS } from './mock/demo-accounts';

// Monday 2 Nov 2026, 11:00 in Berlin; the gift is due on Tuesdays 18:00–19:00.
const MONDAY = new Date('2026-11-02T10:00:00Z');
const TUESDAY_FROM = new Date('2026-11-03T17:00:00Z');
const NEXT_TUESDAY_FROM = new Date('2026-11-10T17:00:00Z');

/** Each test uses its own business/charity pair so jobs don't pick up each other's gifts. */
async function gift(
	charityAccountId: string,
	status: 'active' | 'paused' = 'active',
	nextOccurrenceAt: Date | null = TUESDAY_FROM
) {
	const id = randomUUID();
	await db.insert(recurringGifts).values({
		id,
		businessAccountId: 'biz-korb',
		charityAccountId,
		locationId: 'loc-korb',
		foodType: 'produce',
		message: 'Crates of vegetables',
		frequency: 'weekly',
		weekday: 2,
		dayOfMonth: null,
		pickupTimeFrom: '18:00',
		pickupTimeUntil: '19:00',
		timeZone: 'Europe/Berlin',
		startsOn: '2026-11-01',
		status,
		nextOccurrenceAt
	});
	return { id, scope: { businessAccountId: 'biz-korb', charityAccountId } };
}

const requestsFor = (giftId: string) =>
	db.select().from(pickupRequests).where(eq(pickupRequests.recurringGiftId, giftId));

const nextOf = async (giftId: string) =>
	(
		await db
			.select({ next: recurringGifts.nextOccurrenceAt })
			.from(recurringGifts)
			.where(eq(recurringGifts.id, giftId))
	)[0].next;

describe('materializeDueGifts', () => {
	it('creates an accepted pickup for the coming window and moves the schedule on', async () => {
		const { id, scope } = await gift('charity-mahlzeit');

		expect(await materializeDueGifts(scope, MONDAY)).toBe(1);

		const [request] = await requestsFor(id);
		expect(request).toMatchObject({
			status: 'accepted',
			businessAccountId: 'biz-korb',
			charityAccountId: 'charity-mahlzeit',
			locationId: 'loc-korb',
			proposedPickupFrom: TUESDAY_FROM,
			proposedPickupUntil: new Date('2026-11-03T18:00:00Z')
		});
		expect(await nextOf(id)).toEqual(NEXT_TUESDAY_FROM);
	});

	it('never creates the same pickup twice, even if the cursor is reset', async () => {
		const { id, scope } = await gift(DEMO_ACCOUNTS.charity);

		await materializeDueGifts(scope, MONDAY);
		expect(await materializeDueGifts(scope, MONDAY)).toBe(0);

		// Simulate a crash between inserting and advancing the cursor.
		await db
			.update(recurringGifts)
			.set({ nextOccurrenceAt: TUESDAY_FROM })
			.where(eq(recurringGifts.id, id));
		expect(await materializeDueGifts(scope, MONDAY)).toBe(0);
		expect(await requestsFor(id)).toHaveLength(1);
	});

	it('skips a window that already closed instead of sending it late', async () => {
		const { id, scope } = await gift('charity-alle');
		const tuesdayNight = new Date('2026-11-03T20:00:00Z');

		expect(await materializeDueGifts(scope, tuesdayNight)).toBe(0);
		expect(await requestsFor(id)).toEqual([]);
		expect(await nextOf(id)).toEqual(NEXT_TUESDAY_FROM);
	});

	it('leaves paused gifts and gifts not due yet alone', async () => {
		const paused = await gift('charity-mahlzeit', 'paused');
		await materializeDueGifts(paused.scope, MONDAY);
		expect(await requestsFor(paused.id)).toEqual([]);

		// A week ahead is outside the three-day lead time.
		const later = await gift('charity-mahlzeit', 'active', NEXT_TUESDAY_FROM);
		await materializeDueGifts(later.scope, MONDAY);
		expect(await requestsFor(later.id)).toEqual([]);
		expect(await nextOf(later.id)).toEqual(NEXT_TUESDAY_FROM);
	});
});
