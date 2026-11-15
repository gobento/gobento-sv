// src/lib/server/telemetry.ts
import type { RequestEvent } from '@sveltejs/kit';
import { lt } from 'drizzle-orm';
import { db } from '#lib/server/db.js';
import { telemetryEvents } from '#lib/server/schema.js';
import { deviceFromUserAgent, type ClientTelemetry } from '#lib/telemetry.js';

type NewTelemetryEvent = typeof telemetryEvents.$inferInsert;

export const TELEMETRY_RETENTION_DAYS = 30;

/** Paths whose requests are not worth a row (the beacon itself, assets). */
const SKIP_PREFIXES = ['/api/telemetry', '/_app/', '/favicon', '/manifest', '/service-worker'];

export function shouldRecord(pathname: string): boolean {
	return !SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Keep a promise alive past the response on Vercel (the same hook
 * `@vercel/functions` uses); elsewhere the process outlives the request anyway.
 */
function waitUntil(promise: Promise<unknown>): void {
	const context = (
		globalThis as {
			[key: symbol]: { get?: () => { waitUntil?: (p: Promise<unknown>) => void } } | undefined;
		}
	)[Symbol.for('@vercel/request-context')]?.get?.();
	context?.waitUntil?.(promise);
}

/** Store events without delaying the response or ever throwing. */
function persist(rows: NewTelemetryEvent[]): void {
	if (rows.length === 0) return;
	const write = db
		.insert(telemetryEvents)
		.values(rows)
		.then(() => undefined)
		.catch((error) => console.error('Telemetry write failed:', error));
	waitUntil(write);
}

function baseFields(event: RequestEvent) {
	return {
		route: event.route.id,
		method: event.request.method,
		accountType: event.locals.account?.accountType ?? null,
		device: deviceFromUserAgent(event.request.headers.get('user-agent'))
	};
}

export function recordRequest(event: RequestEvent, status: number): void {
	if (!shouldRecord(event.url.pathname)) return;
	const started = event.locals.startTimer;
	persist([
		{
			kind: 'request',
			...baseFields(event),
			status,
			durationMs: started ? Date.now() - started : null
		}
	]);
}

export function recordServerError(
	event: RequestEvent,
	details: { status: number; message: string; stack?: string; errorId: string }
): void {
	persist([
		{
			kind: 'server_error',
			...baseFields(event),
			status: details.status,
			message: details.message.slice(0, 500),
			stack: details.stack?.slice(0, 4000) ?? null,
			errorId: details.errorId
		}
	]);
}

export function recordClientEvents(event: RequestEvent, events: ClientTelemetry[]): void {
	const accountType = event.locals.account?.accountType ?? null;
	const device = deviceFromUserAgent(event.request.headers.get('user-agent'));
	persist(
		events.map((item) =>
			item.type === 'vital'
				? {
						kind: 'vital',
						name: item.name,
						value: item.value,
						route: item.route,
						accountType,
						device
					}
				: {
						kind: 'client_error',
						message: item.message,
						stack: item.stack,
						route: item.route,
						accountType,
						device
					}
		)
	);
}

/** Drop rows past the retention window. Called from the admin page load. */
export async function pruneTelemetry(now = new Date()): Promise<void> {
	const cutoff = new Date(now.getTime() - TELEMETRY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
	await db.delete(telemetryEvents).where(lt(telemetryEvents.createdAt, cutoff));
}
