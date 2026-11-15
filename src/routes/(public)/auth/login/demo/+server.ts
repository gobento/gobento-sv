// One-click sign-in as a seeded demo account. Only exists in mock mode.
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSession, generateSessionToken } from '#lib/server/auth.js';
import { isMockEnabled } from '#lib/server/mock/index.js';
import { DEMO_ACCOUNTS, type DemoRole } from '#lib/server/mock/demo-accounts.js';

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!isMockEnabled()) throw error(404, 'Not found');

	const role = url.searchParams.get('as') ?? 'user';
	if (!Object.hasOwn(DEMO_ACCOUNTS, role)) throw error(400, 'Unknown demo account');

	const token = generateSessionToken();
	const session = await createSession(token, DEMO_ACCOUNTS[role as DemoRole]);

	cookies.set('session', token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		expires: session.expiresAt,
		path: '/'
	});

	redirect(303, '/');
};
