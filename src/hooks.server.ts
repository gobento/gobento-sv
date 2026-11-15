import { error } from '@sveltejs/kit';

// src/hooks.server.ts
import { validateSessionToken } from '#lib/server/auth.js';
import { TokenBucket } from '#lib/server/rate-limit.js';
import { isPreviewBot, linkPreviewResponse } from '#lib/server/linkPreview.js';
import { sequence, type HandleServerError, type Handle } from '@sveltejs/kit/hooks';
import { log } from '#lib/server/logs.js';
import { recordRequest, recordServerError } from '#lib/server/telemetry.js';
import '@valibot/i18n/de/schema';

const bucket = new TokenBucket<string>(100, 1);

// Record when each request starts so `log()` can report the response time.
const timerHandle: Handle = async ({ event, resolve }) => {
	event.locals.startTimer = Date.now();
	return resolve(event);
};

// One telemetry row per request: route id, status and duration.
const telemetryHandle: Handle = async ({ event, resolve }) => {
	try {
		const response = await resolve(event);
		recordRequest(event, response.status);
		return response;
	} catch (thrown) {
		const status =
			thrown &&
			typeof thrown === 'object' &&
			'status' in thrown &&
			typeof thrown.status === 'number'
				? thrown.status
				: 500;
		recordRequest(event, status);
		throw thrown;
	}
};

const rateLimitHandle: Handle = async ({ event, resolve }) => {
	// Note: Assumes X-Forwarded-For will always be defined.
	const clientIP = event.request.headers.get('X-Forwarded-For');
	if (clientIP === null) {
		return resolve(event);
	}
	let cost: number;
	if (event.request.method === 'GET' || event.request.method === 'OPTIONS') {
		cost = 1;
	} else {
		cost = 3;
	}
	if (!bucket.consume(clientIP, cost)) {
		throw error(429, 'Too many requests');
	}
	return resolve(event);
};

const authHandle: Handle = async ({ event, resolve }) => {
	console.log('🔍 Session - Checking session');
	const sessionToken = event.cookies.get('session');

	if (!sessionToken) {
		event.locals.account = null;
		event.locals.session = null;
		return resolve(event);
	}

	const result = await validateSessionToken(sessionToken);

	if (!result) {
		event.locals.account = null;
		event.locals.session = null;
		event.cookies.delete('session', { path: '/' });
		return resolve(event);
	}

	event.locals.account = result.account;
	event.locals.session = result.session;

	return resolve(event);
};

export const handleError: HandleServerError = async (input) => {
	const { event } = input;
	const errorId = crypto.randomUUID();

	// App errors (`error(...)`), framework errors (404s) and validation errors
	// carry their own status and safe message; anything else is a crash.
	const expected = input.kind !== 'unknown';
	const status = expected ? input.error.status : 500;
	const message = expected ? input.error.message : 'Internal Error';

	// A missing page or asset is not worth a stack trace.
	if (input.kind === 'framework' && status === 404) {
		return { errorId };
	}

	const cause =
		input.error instanceof Error
			? input.error
			: new Error(typeof input.error === 'string' ? input.error : message);

	// Safe error logging without relying on the custom logger, which might fail.
	console.error(
		`\n\u2757 [${errorId}] ${event.request.method} ${event.url.pathname} \u2192 ${status} ${message}`
	);
	console.error(`   account: ${event.locals.account?.id ?? 'anonymous'}`);
	console.error(`   session: ${event.locals.session?.id ?? 'none'}`);
	if (!expected) {
		console.error(`   message: ${cause.message}`);
		if (cause.stack) console.error(cause.stack);
	}

	recordServerError(event, {
		status,
		message: expected ? message : cause.message || 'Unknown error',
		stack: expected ? undefined : cause.stack,
		errorId
	});

	// Try to persist the error with the custom logger, but never let it throw.
	try {
		event.locals.error = expected ? message : cause.message || 'Unknown error';
		event.locals.errorStackTrace = expected ? undefined : cause.stack;
		event.locals.errorId = errorId;

		await log(status, event);
	} catch (logError) {
		console.error('Failed to call log function:', logError);
	}

	// Expected errors keep their own message; crashes get a generic one.
	return expected ? { errorId } : { message: 'An unexpected error occurred.', errorId };
};

/** Signed-out preview crawlers get the shared offer's or location's own card. */
const linkPreviewHandle: Handle = async ({ event, resolve }) => {
	if (
		!event.locals.account &&
		event.request.method === 'GET' &&
		isPreviewBot(event.request.headers.get('user-agent')) &&
		// After the bot check: prerendering forbids reading the query string.
		!event.url.searchParams.has('app')
	) {
		const preview = await linkPreviewResponse(event.url).catch((error) => {
			console.error('Link preview failed:', error);
			return null;
		});
		if (preview) return preview;
	}
	return resolve(event);
};

export const handle = sequence(
	timerHandle,
	telemetryHandle,
	rateLimitHandle,
	authHandle,
	linkPreviewHandle
);
