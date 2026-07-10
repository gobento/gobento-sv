// src/hooks.server.ts
import { validateSessionToken } from '$lib/server/auth';
import { TokenBucket } from '$lib/server/rate-limit';
import { sequence } from '@sveltejs/kit/hooks';
import type { HandleServerError } from '@sveltejs/kit';
import { log } from '$lib/server/logs';
import { error, type Handle } from '@sveltejs/kit';

import '@valibot/i18n/de/schema';

const bucket = new TokenBucket<string>(100, 1);

// Record when each request starts so `log()` can report the response time.
const timerHandle: Handle = async ({ event, resolve }) => {
	event.locals.startTimer = Date.now();
	return resolve(event);
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

export const handleError: HandleServerError = async ({ error, event, status, message }) => {
	const errorId = crypto.randomUUID();
	const normalizedError =
		error instanceof Error ? error : new Error(typeof error === 'string' ? error : message);

	// Safe error logging without relying on the custom logger, which might fail.
	console.error(
		`\n\u2757 [${errorId}] ${event.request.method} ${event.url.pathname} \u2192 ${status} ${message}`
	);
	console.error(`   account: ${event.locals.account?.id ?? 'anonymous'}`);
	console.error(`   session: ${event.locals.session?.id ?? 'none'}`);
	console.error(`   message: ${normalizedError.message}`);
	if (normalizedError.stack) {
		console.error(normalizedError.stack);
	}

	// Try to persist the error with the custom logger, but never let it throw.
	try {
		event.locals.error = normalizedError.message || 'Unknown error';
		event.locals.errorStackTrace = normalizedError.stack;
		event.locals.errorId = errorId;

		await log(status, event);
	} catch (logError) {
		console.error('Failed to call log function:', logError);
	}

	return {
		message: 'An unexpected error occurred.',
		errorId
	};
};

export const handle = sequence(timerHandle, rateLimitHandle, authHandle);
