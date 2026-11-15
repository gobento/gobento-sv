// src/lib/server/recurringGifts.ts
/**
 * Turns active regular gifts into pickup requests a few days ahead of each
 * pickup window. Runs from a daily cron and, so nothing depends on the cron,
 * lazily whenever a business or charity opens a page that shows gifts.
 */
import { db } from './db';
import { recurringGifts, pickupRequests, type RecurringGift } from './schema';
import { and, eq, lte, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { formatWindowInZone, nextOccurrence, type GiftSchedule } from '#lib/recurringGifts.js';
import { notifyAccount } from './notifications';
import { PUBLIC_APP_URL } from '$app/env/private';

/** How far ahead an occurrence is announced to the charity. */
export const GIFT_LEAD_TIME_MS = 3 * 24 * 60 * 60 * 1000;

/** Upper bound per gift and run, so a long-paused gift can't create a backlog. */
const MAX_PER_RUN = 8;

export function scheduleOf(gift: RecurringGift): GiftSchedule {
	return {
		frequency: gift.frequency,
		weekday: gift.weekday,
		dayOfMonth: gift.dayOfMonth,
		timeFrom: gift.pickupTimeFrom,
		timeUntil: gift.pickupTimeUntil,
		timeZone: gift.timeZone,
		startsOn: gift.startsOn
	};
}

/** Next occurrence from now; used when a gift is accepted or resumed. */
export function firstOccurrenceFrom(gift: RecurringGift, now = new Date()): Date | null {
	return nextOccurrence(scheduleOf(gift), now)?.from ?? null;
}

interface Scope {
	businessAccountId?: string;
	charityAccountId?: string;
}

/** Creates the pickup requests that are now due. Returns how many were created. */
export async function materializeDueGifts(scope: Scope = {}, now = new Date()): Promise<number> {
	const horizon = new Date(now.getTime() + GIFT_LEAD_TIME_MS);

	const filters = [eq(recurringGifts.status, 'active'), lte(recurringGifts.nextOccurrenceAt, horizon)];
	if (scope.businessAccountId) {
		filters.push(eq(recurringGifts.businessAccountId, scope.businessAccountId));
	}
	if (scope.charityAccountId) {
		filters.push(eq(recurringGifts.charityAccountId, scope.charityAccountId));
	}

	const due = await db
		.select()
		.from(recurringGifts)
		.where(and(...filters));

	let created = 0;
	for (const gift of due) {
		try {
			created += await materializeGift(gift, now, horizon);
		} catch (err) {
			console.error(`Failed to schedule regular gift ${gift.id}:`, err);
		}
	}
	return created;
}

async function materializeGift(gift: RecurringGift, now: Date, horizon: Date): Promise<number> {
	const schedule = scheduleOf(gift);
	let cursor = gift.nextOccurrenceAt;
	let created = 0;
	let firstWindow: { from: Date; until: Date } | null = null;

	for (let i = 0; cursor && cursor <= horizon && i < MAX_PER_RUN; i++) {
		const occurrence = nextOccurrence(schedule, cursor);
		if (!occurrence) {
			cursor = null;
			break;
		}
		if (occurrence.from > horizon) {
			cursor = occurrence.from;
			break;
		}

		// A window that already closed (e.g. the gift was not looked at for a
		// while) is skipped rather than sent late.
		if (occurrence.until > now) {
			const inserted = await db
				.insert(pickupRequests)
				.values({
					id: randomUUID(),
					businessAccountId: gift.businessAccountId,
					charityAccountId: gift.charityAccountId,
					locationId: gift.locationId,
					foodType: gift.foodType,
					message: gift.message,
					proposedPickupFrom: occurrence.from,
					proposedPickupUntil: occurrence.until,
					// The charity agreed to the whole schedule when accepting the gift.
					status: 'accepted',
					respondedAt: now,
					recurringGiftId: gift.id
				})
				.onConflictDoNothing()
				.returning({ id: pickupRequests.id });
			if (inserted.length > 0) {
				created++;
				firstWindow ??= occurrence;
			}
		}

		cursor = new Date(occurrence.from.getTime() + 60 * 1000);
	}

	// Advance only if nobody else moved the cursor in the meantime.
	const next = cursor ? (nextOccurrence(schedule, cursor)?.from ?? null) : null;
	await db
		.update(recurringGifts)
		.set({ nextOccurrenceAt: next })
		.where(
			and(
				eq(recurringGifts.id, gift.id),
				gift.nextOccurrenceAt
					? eq(recurringGifts.nextOccurrenceAt, gift.nextOccurrenceAt)
					: isNull(recurringGifts.nextOccurrenceAt)
			)
		);

	if (firstWindow) {
		const url = `${PUBLIC_APP_URL || 'http://localhost:5173'}/donations`;
		await notifyAccount(gift.charityAccountId, {
			title: 'Regular pickup coming up',
			message: `Your regular food pickup is scheduled for ${formatWindowInZone(firstWindow, gift.timeZone)}.`,
			tags: ['repeat', 'shopping_bags'],
			priority: 'default',
			click: url,
			actions: [{ action: 'view', label: 'View', url }]
		}).catch((err) => console.error('Failed to notify charity about a regular gift:', err));
	}

	return created;
}
