/** Formatting and phase helpers for a reservation's pickup window. */
import { formatDate, formatTimeOfDay } from '#lib/dates.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** 24h wall-clock time, e.g. "20:00". */
export function formatClock(date: Date | string): string {
	return formatTimeOfDay(date);
}

/** "Today", "Tomorrow", "Yesterday", otherwise "15.11.2026". */
export function formatDay(date: Date | string, now: Date | number = Date.now()): string {
	const value = new Date(date);
	const today = new Date(now);
	const days = Math.round((startOfDay(value) - startOfDay(today)) / DAY_MS);
	if (days === 0) return 'Today';
	if (days === 1) return 'Tomorrow';
	if (days === -1) return 'Yesterday';
	return formatDate(value);
}

/** "Today, 20:00–22:00" or "15.11.2026, 20:00–22:00" */
export function formatPickupWindow(
	from: Date | string,
	until: Date | string,
	now: Date | number = Date.now()
): string {
	return `${formatDay(from, now)}, ${formatClock(from)}–${formatClock(until)}`;
}

/** "Today, 18:04" or "15.11.2026, 18:04". */
export function formatMoment(date: Date | string, now: Date | number = Date.now()): string {
	return `${formatDay(date, now)}, ${formatClock(date)}`;
}

export type PickupPhase = 'upcoming' | 'open' | 'closed';

export function pickupPhase(from: Date | string, until: Date | string, now: number): PickupPhase {
	if (now < new Date(from).getTime()) return 'upcoming';
	if (now <= new Date(until).getTime()) return 'open';
	return 'closed';
}

export interface Countdown {
	days: number;
	hours: string;
	minutes: string;
	seconds: string;
}

/** Splits the time left until `target` into zero-padded parts; never negative. */
export function countdownTo(target: Date | string, now: number): Countdown {
	const total = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
	const pad = (value: number) => value.toString().padStart(2, '0');
	return {
		days: Math.floor(total / 86400),
		hours: pad(Math.floor((total % 86400) / 3600)),
		minutes: pad(Math.floor((total % 3600) / 60)),
		seconds: pad(total % 60)
	};
}
