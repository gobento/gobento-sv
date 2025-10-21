// src/hooks.server.ts
import { validateSessionToken } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
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
