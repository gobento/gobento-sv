// src/lib/recurringGifts.ts
/**
 * Regular gifts: a business commits to giving surplus food to a charity on a
 * fixed schedule (weekly, every two weeks or monthly). Each occurrence becomes a
 * normal pickup request, so this module only knows how to compute *when*.
 *
 * Times are wall-clock times in the schedule's own IANA time zone, so "every
 * Tuesday 18:00" stays at 18:00 across daylight-saving changes. Kept free of
 * server imports so the pages can describe a schedule too.
 */

export const GIFT_FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;
export type GiftFrequency = (typeof GIFT_FREQUENCIES)[number];

export const GIFT_FREQUENCY_LABELS: Record<GiftFrequency, string> = {
	weekly: 'Every week',
	biweekly: 'Every 2 weeks',
	monthly: 'Every month'
};

/** Sunday-first, matching `Date#getUTCDay()`. */
export const WEEKDAYS = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday'
] as const;

/** Monthly gifts stop at the 28th so every month has the day. */
export const MAX_DAY_OF_MONTH = 28;

export const GIFT_STATUSES = ['proposed', 'active', 'paused', 'declined', 'ended'] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];

export interface GiftSchedule {
	frequency: GiftFrequency;
	/** 0–6, Sunday first. Used by weekly and biweekly gifts. */
	weekday: number | null;
	/** 1–28. Used by monthly gifts. */
	dayOfMonth: number | null;
	/** "HH:MM" (a trailing ":SS" from Postgres `time` is ignored). */
	timeFrom: string;
	timeUntil: string;
	timeZone: string;
	/** "YYYY-MM-DD" in the schedule's zone; the first possible pickup day. */
	startsOn: string;
}

export interface Occurrence {
	from: Date;
	until: Date;
}

export function isGiftFrequency(value: unknown): value is GiftFrequency {
	return typeof value === 'string' && (GIFT_FREQUENCIES as readonly string[]).includes(value);
}

export function isValidTimeZone(zone: unknown): zone is string {
	if (typeof zone !== 'string' || !zone) return false;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: zone });
		return true;
	} catch {
		return false;
	}
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parses "HH:MM" or "HH:MM:SS"; null when malformed. */
export function parseTime(value: string): { hour: number; minute: number } | null {
	const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
	if (!match) return null;
	const hour = Number(match[1]);
	const minute = Number(match[2]);
	if (hour > 23 || minute > 59) return null;
	return { hour, minute };
}

/** "18:00:00" → "18:00" */
export function shortTime(value: string): string {
	const parsed = parseTime(value);
	if (!parsed) return value;
	return `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
}

/** A calendar day as a UTC midnight timestamp; makes day arithmetic DST-proof. */
function dayNumber(year: number, month: number, day: number): number {
	return Date.UTC(year, month - 1, day) / DAY_MS;
}

function parseDay(value: string): number | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return null;
	return dayNumber(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** Wall-clock parts of `instant` in `timeZone`. */
function zonedParts(instant: Date, timeZone: string) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric'
	}).formatToParts(instant);
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
	return {
		year: get('year'),
		month: get('month'),
		day: get('day'),
		hour: get('hour'),
		minute: get('minute'),
		second: get('second')
	};
}

/** Offset of `timeZone` from UTC at `instant`, in ms. */
function zoneOffset(instant: number, timeZone: string): number {
	const p = zonedParts(new Date(instant), timeZone);
	const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
	return asUtc - Math.floor(instant / 1000) * 1000;
}

/** The instant at which the clock in `timeZone` shows the given day and time. */
export function zonedToUtc(day: number, hour: number, minute: number, timeZone: string): Date {
	const wall = day * DAY_MS + (hour * 60 + minute) * 60 * 1000;
	let instant = wall - zoneOffset(wall, timeZone);
	// A second pass settles times near a DST switch.
	instant = wall - zoneOffset(instant, timeZone);
	return new Date(instant);
}

/** Today's date ("YYYY-MM-DD") in `timeZone`. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
	const p = zonedParts(now, timeZone);
	return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function dayMatches(schedule: GiftSchedule, day: number, anchor: number): boolean {
	const date = new Date(day * DAY_MS);
	if (schedule.frequency === 'monthly') {
		return date.getUTCDate() === schedule.dayOfMonth;
	}
	if (date.getUTCDay() !== schedule.weekday) return false;
	if (schedule.frequency === 'biweekly') {
		return Math.round(day - anchor) % 14 === 0;
	}
	return true;
}

/** Problems with a schedule, phrased for the person filling in the form. */
export function validateSchedule(schedule: GiftSchedule): string | null {
	if (!isGiftFrequency(schedule.frequency)) return 'Choose how often you want to give';
	if (schedule.frequency === 'monthly') {
		const d = schedule.dayOfMonth;
		if (d === null || !Number.isInteger(d) || d < 1 || d > MAX_DAY_OF_MONTH) {
			return `Choose a day of the month between 1 and ${MAX_DAY_OF_MONTH}`;
		}
	} else {
		const w = schedule.weekday;
		if (w === null || !Number.isInteger(w) || w < 0 || w > 6) return 'Choose a weekday';
	}
	const from = parseTime(schedule.timeFrom);
	const until = parseTime(schedule.timeUntil);
	if (!from || !until) return 'Enter a pickup window';
	if (until.hour * 60 + until.minute <= from.hour * 60 + from.minute) {
		return 'The pickup window must end after it starts';
	}
	if (!isValidTimeZone(schedule.timeZone)) return 'Unknown time zone';
	if (parseDay(schedule.startsOn) === null) return 'Choose a start date';
	return null;
}

/**
 * The first occurrence whose pickup window starts at or after `after`.
 * Biweekly gifts count their fortnights from the first matching day on or
 * after `startsOn`, so the rhythm never drifts.
 */
export function nextOccurrence(schedule: GiftSchedule, after: Date): Occurrence | null {
	if (validateSchedule(schedule)) return null;
	const from = parseTime(schedule.timeFrom)!;
	const until = parseTime(schedule.timeUntil)!;
	const startDay = parseDay(schedule.startsOn)!;

	let anchor = startDay;
	if (schedule.frequency !== 'monthly') {
		while (new Date(anchor * DAY_MS).getUTCDay() !== schedule.weekday) anchor++;
	}

	const local = zonedParts(after, schedule.timeZone);
	// Start a day early so a window later today (in the zone) is not skipped.
	let day = Math.max(startDay, dayNumber(local.year, local.month, local.day) - 1);
	const limit = day + 62;

	for (; day <= limit; day++) {
		if (!dayMatches(schedule, day, anchor)) continue;
		const start = zonedToUtc(day, from.hour, from.minute, schedule.timeZone);
		if (start.getTime() < after.getTime()) continue;
		return { from: start, until: zonedToUtc(day, until.hour, until.minute, schedule.timeZone) };
	}
	return null;
}

/** "Every Tuesday, 18:00–19:00" / "Every 2 weeks on Friday, …" / "Monthly on the 3rd, …" */
export function describeSchedule(
	schedule: Pick<GiftSchedule, 'frequency' | 'weekday' | 'dayOfMonth' | 'timeFrom' | 'timeUntil'>
): string {
	const window = `${shortTime(schedule.timeFrom)}–${shortTime(schedule.timeUntil)}`;
	if (schedule.frequency === 'monthly') {
		return `Monthly on the ${ordinal(schedule.dayOfMonth ?? 1)}, ${window}`;
	}
	const weekday = WEEKDAYS[schedule.weekday ?? 0];
	if (schedule.frequency === 'biweekly') return `Every 2 weeks on ${weekday}, ${window}`;
	return `Every ${weekday}, ${window}`;
}

export function ordinal(n: number): string {
	const tens = n % 100;
	if (tens >= 11 && tens <= 13) return `${n}th`;
	return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** "17.11.2026, 18:00–19:00" as read on a clock in `timeZone`. */
export function formatWindowInZone(window: Occurrence, timeZone: string): string {
	const start = zonedParts(window.from, timeZone);
	const end = zonedParts(window.until, timeZone);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${pad(start.day)}.${pad(start.month)}.${start.year}, ${pad(start.hour)}:${pad(start.minute)}–${pad(end.hour)}:${pad(end.minute)}`;
}
