import { redirect } from '@sveltejs/kit';
import { generateState, generateCodeVerifier } from 'arctic';
import { google } from '#lib/server/auth.js';
import { safeRedirectPath } from '#lib/navigation.js';
import type { RequestHandler } from './$types';

const OAUTH_COOKIE = {
	path: '/',
	secure: import.meta.env.PROD,
	httpOnly: true,
	maxAge: 60 * 10,
	sameSite: 'lax'
} as const;

export const GET: RequestHandler = async ({ url, cookies }) => {
	const state = generateState();
	const codeVerifier = generateCodeVerifier();

	// Only same-origin paths survive; the callback validates again before redirecting.
	const next = safeRedirectPath(url.searchParams.get('next'));

	const authUrl = google.createAuthorizationURL(state, codeVerifier, ['profile', 'email']);

	// The post-login target travels in our own cookie (state|target), never through Google.
	cookies.set('google_oauth_state', `${state}|${encodeURIComponent(next)}`, OAUTH_COOKIE);
	cookies.set('google_code_verifier', codeVerifier, OAUTH_COOKIE);

	redirect(302, authUrl.toString());
};
