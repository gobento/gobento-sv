import { describe, expect, it } from 'vitest';
import {
	describeSchedule,
	nextOccurrence,
	validateSchedule,
	zonedToUtc,
	type GiftSchedule
} from './recurringGifts';

const base: GiftSchedule = {
	frequency: 'weekly',
	weekday: 2, // Tuesday
	dayOfMonth: null,
	timeFrom: '18:00',
	timeUntil: '19:00',
	timeZone: 'Europe/Berlin',
	startsOn: '2026-11-01'
};

const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;

describe('zonedToUtc', () => {
	it('honours daylight saving time', () => {
		expect(zonedToUtc(day('2026-07-01'), 18, 0, 'Europe/Berlin').toISOString()).toBe(
			'2026-07-01T16:00:00.000Z'
		);
		expect(zonedToUtc(day('2026-12-01'), 18, 0, 'Europe/Berlin').toISOString()).toBe(
			'2026-12-01T17:00:00.000Z'
		);
	});
});

describe('nextOccurrence', () => {
	it('finds the next weekday in the schedule zone', () => {
		// Sunday 15 Nov 2026, noon UTC → Tuesday 17 Nov, 18:00 Berlin (17:00 UTC)
		const next = nextOccurrence(base, new Date('2026-11-15T12:00:00Z'))!;
		expect(next.from.toISOString()).toBe('2026-11-17T17:00:00.000Z');
		expect(next.until.toISOString()).toBe('2026-11-17T18:00:00.000Z');
	});

	it('includes a window later the same day', () => {
		const next = nextOccurrence(base, new Date('2026-11-17T10:00:00Z'))!;
		expect(next.from.toISOString()).toBe('2026-11-17T17:00:00.000Z');
	});

	it('skips a window that already started', () => {
		const next = nextOccurrence(base, new Date('2026-11-17T17:30:00Z'))!;
		expect(next.from.toISOString()).toBe('2026-11-24T17:00:00.000Z');
	});

	it('never starts before startsOn', () => {
		const next = nextOccurrence({ ...base, startsOn: '2026-12-01' }, new Date('2026-11-15T00:00Z'))!;
		expect(next.from.toISOString()).toBe('2026-12-01T17:00:00.000Z');
	});

	it('keeps the fortnightly rhythm anchored to the first pickup', () => {
		const schedule: GiftSchedule = { ...base, frequency: 'biweekly', startsOn: '2026-11-03' };
		const first = nextOccurrence(schedule, new Date('2026-11-01T00:00Z'))!;
		expect(first.from.toISOString()).toBe('2026-11-03T17:00:00.000Z');
		const second = nextOccurrence(schedule, new Date(first.from.getTime() + 60000))!;
		expect(second.from.toISOString()).toBe('2026-11-17T17:00:00.000Z');
	});

	it('handles monthly gifts', () => {
		const schedule: GiftSchedule = { ...base, frequency: 'monthly', weekday: null, dayOfMonth: 5 };
		const next = nextOccurrence(schedule, new Date('2026-11-15T00:00Z'))!;
		expect(next.from.toISOString()).toBe('2026-12-05T17:00:00.000Z');
	});
});

describe('validateSchedule', () => {
	it('rejects an inverted window and unknown zones', () => {
		expect(validateSchedule({ ...base, timeUntil: '17:00' })).toMatch(/end after/);
		expect(validateSchedule({ ...base, timeZone: 'Mars/Olympus' })).toMatch(/time zone/);
		expect(validateSchedule(base)).toBeNull();
	});
});

describe('describeSchedule', () => {
	it('reads naturally', () => {
		expect(describeSchedule(base)).toBe('Every Tuesday, 18:00–19:00');
		expect(describeSchedule({ ...base, frequency: 'monthly', dayOfMonth: 3, timeFrom: '09:00:00' })).toBe(
			'Monthly on the 3rd, 09:00–19:00'
		);
	});
});
