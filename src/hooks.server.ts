// src/hooks.server.ts

import { validateSessionToken } from '$lib/server/auth';

import { TokenBucket } from '$lib/server/rate-limit';
import { sequence } from '@sveltejs/kit/hooks';

import { paraglideMiddleware } from '$lib/paraglide/server';
import { error, type Handle } from '@sveltejs/kit';

import '@valibot/i18n/de/schema';

const bucket = new TokenBucket<string>(100, 1);

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

const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%lang%', locale)
		});
	});

export const handle = sequence(rateLimitHandle, authHandle, paraglideHandle);
