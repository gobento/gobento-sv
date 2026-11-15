import { formatDate } from '#lib/dates.js';
import type { Component } from 'svelte';
import IconAll from '~icons/fluent-emoji-flat/bento-box';
import IconBakery from '~icons/fluent-emoji-flat/croissant';
import IconRestaurant from '~icons/fluent-emoji-flat/fork-and-knife-with-plate';
import IconCafe from '~icons/fluent-emoji-flat/hot-beverage';
import IconGrocery from '~icons/fluent-emoji-flat/leafy-green';
import IconSupermarket from '~icons/fluent-emoji-flat/shopping-cart';
import IconHotel from '~icons/fluent-emoji-flat/hotel';
import IconCatering from '~icons/fluent-emoji-flat/pot-of-food';
import IconOther from '~icons/fluent-emoji-flat/takeout-box';

export interface BusinessTypeOption {
	value: string;
	label: string;
	icon: Component;
}

export const ALL_TYPES = 'all';

export const BUSINESS_TYPES: BusinessTypeOption[] = [
	{ value: ALL_TYPES, label: 'All', icon: IconAll },
	{ value: 'bakery', label: 'Bakery', icon: IconBakery },
	{ value: 'restaurant', label: 'Restaurant', icon: IconRestaurant },
	{ value: 'cafe', label: 'Café', icon: IconCafe },
	{ value: 'grocery', label: 'Grocery', icon: IconGrocery },
	{ value: 'supermarket', label: 'Supermarket', icon: IconSupermarket },
	{ value: 'hotel', label: 'Hotel', icon: IconHotel },
	{ value: 'catering', label: 'Catering', icon: IconCatering },
	{ value: 'other', label: 'Other', icon: IconOther }
];

export function businessTypeLabel(type: string): string {
	if (type === 'other') return 'Local business';
	return BUSINESS_TYPES.find((option) => option.value === type)?.label ?? 'Local business';
}

/** The app prices in toman for Iranian businesses and in euro everywhere else. */
export function currencyFor(country: string | null | undefined): string {
	return country === 'Iran' ? 'IRR' : 'EUR';
}

export function discountPercent(originalValue: number, price: number): number {
	if (!(originalValue > 0) || price >= originalValue) return 0;
	return Math.round(((originalValue - price) / originalValue) * 100);
}

/** "18:30:00" -> "18:30" */
export function hhmm(time: string): string {
	return time.slice(0, 5);
}

function minutesOf(time: string): number {
	const [hours, minutes] = time.split(':').map(Number);
	return hours * 60 + (minutes || 0);
}

/** Local calendar date as `YYYY-MM-DD` (unlike `toISOString`, which is UTC). */
export function isoDate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

/** "Today", "Tomorrow" or "15.11.2026". */
export function relativeDay(date: Date | string, now: Date = new Date()): string {
	const target = typeof date === 'string' ? new Date(`${date.slice(0, 10)}T12:00:00`) : date;
	const iso = isoDate(target);
	if (iso === isoDate(now)) return 'Today';
	if (iso === isoDate(addDays(now, 1))) return 'Tomorrow';
	return formatDate(target);
}

export interface PickupWindow {
	/** "Today", "Tomorrow" or "" when the offer can no longer be collected. */
	day: string;
	/** "18:00–19:30" */
	range: string;
	/** Full label for cards: "Today 18:00–19:30". */
	label: string;
	/** The one-off pickup window is over. */
	ended: boolean;
	/** Minutes until today's window closes; null when it is not today's window. */
	minutesLeft: number | null;
}

/**
 * Next pickup window of an offer. Recurring offers roll over to tomorrow once
 * today's window has closed; one-off offers simply end.
 */
export function pickupWindow(
	offer: { pickupTimeFrom: string; pickupTimeUntil: string; isRecurring?: boolean },
	now: Date = new Date()
): PickupWindow {
	const range = `${hhmm(offer.pickupTimeFrom)}–${hhmm(offer.pickupTimeUntil)}`;
	const minutesLeft = minutesOf(offer.pickupTimeUntil) - (now.getHours() * 60 + now.getMinutes());

	if (minutesLeft > 0)
		return { day: 'Today', range, label: `Today, ${range}`, ended: false, minutesLeft };
	if (offer.isRecurring)
		return { day: 'Tomorrow', range, label: `Tomorrow, ${range}`, ended: false, minutesLeft: null };
	return { day: '', range, label: 'Pickup ended', ended: true, minutesLeft: null };
}
