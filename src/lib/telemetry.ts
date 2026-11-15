// src/lib/telemetry.ts
/**
 * Shared, dependency-free telemetry helpers: payload validation for the
 * browser beacon and small formatting helpers. Kept out of `server/` so the
 * client reporter and the unit tests can import them.
 */

export const VITAL_NAMES = ['ttfb', 'fcp', 'lcp', 'cls', 'inp', 'nav'] as const;
export type VitalName = (typeof VITAL_NAMES)[number];

export type Device = 'mobile' | 'desktop' | 'bot';

export interface ClientVital {
	type: 'vital';
	name: VitalName;
	value: number;
	route: string | null;
}

export interface ClientError {
	type: 'error';
	message: string;
	stack: string | null;
	route: string | null;
}

export type ClientTelemetry = ClientVital | ClientError;

/** Most events one beacon may carry; the rest are dropped. */
export const MAX_BEACON_EVENTS = 20;
const MAX_MESSAGE = 500;
const MAX_STACK = 4000;
const MAX_ROUTE = 200;

function clip(value: unknown, max: number): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed.slice(0, max) : null;
}

/** Route ids look like `/(dock)/offers/[id]`; anything else is discarded. */
function routeId(value: unknown): string | null {
	const route = clip(value, MAX_ROUTE);
	return route && route.startsWith('/') && !/[?#\s]/.test(route) ? route : null;
}

/**
 * Turn an untrusted beacon body into events worth storing. Unknown shapes,
 * out-of-range numbers and oversized strings are dropped or clipped, never
 * thrown on.
 */
export function parseBeacon(body: unknown): ClientTelemetry[] {
	const items = Array.isArray(body) ? body : [];
	const events: ClientTelemetry[] = [];
	for (const item of items.slice(0, MAX_BEACON_EVENTS)) {
		if (!item || typeof item !== 'object') continue;
		const raw = item as Record<string, unknown>;
		if (raw.type === 'vital') {
			const name = raw.name as VitalName;
			const value = raw.value;
			if (!VITAL_NAMES.includes(name)) continue;
			if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) continue;
			// CLS is unitless (usually < 1), everything else is milliseconds.
			if (value > (name === 'cls' ? 100 : 600_000)) continue;
			events.push({ type: 'vital', name, value, route: routeId(raw.route) });
		} else if (raw.type === 'error') {
			const message = clip(raw.message, MAX_MESSAGE);
			if (!message) continue;
			events.push({
				type: 'error',
				message,
				stack: clip(raw.stack, MAX_STACK),
				route: routeId(raw.route)
			});
		}
	}
	return events;
}

/** Coarse device class from a user agent; enough to split the stats. */
export function deviceFromUserAgent(userAgent: string | null | undefined): Device {
	const ua = userAgent ?? '';
	if (/bot|crawl|spider|slurp|preview|headless|lighthouse/i.test(ua)) return 'bot';
	if (/mobi|android|iphone|ipad|ipod/i.test(ua)) return 'mobile';
	return 'desktop';
}

/** `/(dock)/offers/[id]` → `/offers/[id]`: route groups are noise for humans. */
export function displayRoute(route: string | null | undefined): string {
	if (!route) return '(no route)';
	const cleaned = route.replace(/\/\([^)]+\)/g, '');
	return cleaned || '/';
}
