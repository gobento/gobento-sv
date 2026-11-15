// src/routes/(public)/api/telemetry/+server.ts
import type { RequestHandler } from './$types';
import { parseBeacon } from '#lib/telemetry.js';
import { recordClientEvents } from '#lib/server/telemetry.js';

const MAX_BODY_BYTES = 32 * 1024;

/**
 * Beacon for browser telemetry (performance metrics and uncaught errors).
 * Always answers 204 so a broken payload never surfaces in the client.
 */
export const POST: RequestHandler = async (event) => {
	const length = Number(event.request.headers.get('content-length') ?? 0);
	if (length <= MAX_BODY_BYTES) {
		try {
			const text = await event.request.text();
			if (text.length <= MAX_BODY_BYTES) {
				recordClientEvents(event, parseBeacon(JSON.parse(text)));
			}
		} catch {
			// Malformed JSON: ignore.
		}
	}
	return new Response(null, { status: 204 });
};
