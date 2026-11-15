import { OAuth2RequestError } from 'arctic';
import { google, generateSessionToken, createSession } from '#lib/server/auth.js';
import { db } from '#lib/server/db.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { accounts, userProfiles } from '#lib/server/schema.js';
import { safeRedirectPath } from '#lib/navigation.js';

function decodeRedirect(encoded: string | undefined): string {
	if (!encoded) return '/';
	try {
		return safeRedirectPath(decodeURIComponent(encoded));
	} catch {
		return '/';
	}
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedStateWithRedirect = cookies.get('google_oauth_state');
	const codeVerifier = cookies.get('google_code_verifier');

	if (!code || !state || !storedStateWithRedirect || !codeVerifier) {
		return new Response('Invalid request', { status: 400 });
	}

	const separator = storedStateWithRedirect.indexOf('|');
	const storedState =
		separator === -1 ? storedStateWithRedirect : storedStateWithRedirect.slice(0, separator);
	let redirectTo = decodeRedirect(
		separator === -1 ? undefined : storedStateWithRedirect.slice(separator + 1)
	);

	if (state !== storedState) {
		return new Response('Invalid state', { status: 400 });
	}

	try {
		const tokens = await google.validateAuthorizationCode(code, codeVerifier);
		const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
			headers: { Authorization: `Bearer ${tokens.accessToken()}` }
		});

		if (!response.ok) {
			throw new Error(`Google userinfo request failed with ${response.status}`);
		}

		const googleUser: { sub?: string; email?: string; email_verified?: boolean } =
			await response.json();

		// Accounts are matched by email, so an unverified address must never sign in.
		if (!googleUser.sub || !googleUser.email || googleUser.email_verified === false) {
			cookies.delete('google_oauth_state', { path: '/' });
			cookies.delete('google_code_verifier', { path: '/' });
			return new Response('Your Google account has no verified email address', { status: 400 });
		}

		const [existingAccount] = await db
			.select()
			.from(accounts)
			.where(eq(accounts.email, googleUser.email))
			.limit(1);

		let account = existingAccount;
		if (!account) {
			// New sign-ups start as a regular user and pick their role during onboarding.
			[account] = await db
				.insert(accounts)
				.values({ id: googleUser.sub, email: googleUser.email, accountType: 'user' })
				.returning();

			await db.insert(userProfiles).values({ accountId: account.id });

			redirectTo = '/welcome';
		}

		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, account.id);

		cookies.set('session', sessionToken, {
			httpOnly: true,
			sameSite: 'lax',
			secure: import.meta.env.PROD,
			expires: session.expiresAt,
			path: '/'
		});

		cookies.delete('google_oauth_state', { path: '/' });
		cookies.delete('google_code_verifier', { path: '/' });

		return new Response(null, { status: 302, headers: { Location: redirectTo } });
	} catch (e) {
		console.error('Google sign-in failed:', e instanceof Error ? e.message : e);

		cookies.delete('google_oauth_state', { path: '/' });
		cookies.delete('google_code_verifier', { path: '/' });

		if (e instanceof OAuth2RequestError) {
			return new Response('Sign-in was cancelled or expired. Please try again.', { status: 400 });
		}
		return new Response('Sign-in failed. Please try again.', { status: 500 });
	}
};
