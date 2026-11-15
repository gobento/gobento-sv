// src/routes/(public)/auth/callback/telegram/+server.ts
/**
 * Telegram Login Widget callback. Signs in the account connected to this
 * Telegram user, creates one for a new user, or (with a matching one-time
 * nonce from the profile page) connects Telegram to the signed-in account.
 */
import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { TELEGRAM_BOT_TOKEN } from '$app/env/private';
import { db } from '#lib/server/db.js';
import { accounts, userProfiles } from '#lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { createSession, generateSessionToken } from '#lib/server/auth.js';
import { verifyTelegramLogin } from '#lib/server/telegramAuth.js';
import { ssoRequiredFor } from '#lib/server/sso.js';
import { safeRedirectPath } from '#lib/navigation.js';
import { safeEqual } from '#lib/pickupCode.js';

// Dynamic: the (public) group prerenders by default.
export const prerender = false;

const TELEGRAM_LINK_COOKIE = 'tg_link';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const user = verifyTelegramLogin(url.searchParams, TELEGRAM_BOT_TOKEN);
	if (!user) redirect(303, '/auth/login?error=telegram');

	const [owner] = await db
		.select()
		.from(accounts)
		.where(eq(accounts.telegramId, user.id))
		.limit(1);

	// Connecting Telegram to the signed-in account. The nonce proves the request
	// started on this browser's profile page, so nobody can make a signed-in
	// victim link the attacker's Telegram.
	const linkNonce = url.searchParams.get('link');
	if (linkNonce) {
		const expected = cookies.get(TELEGRAM_LINK_COOKIE);
		cookies.delete(TELEGRAM_LINK_COOKIE, { path: '/auth/callback/telegram' });
		if (!locals.account || !expected || !safeEqual(expected, linkNonce)) {
			redirect(303, '/profile?telegram=failed');
		}
		if (owner && owner.id !== locals.account.id) redirect(303, '/profile?telegram=taken');
		await db
			.update(accounts)
			.set({ telegramId: user.id })
			.where(eq(accounts.id, locals.account.id));
		redirect(303, '/profile?telegram=connected');
	}

	let account = owner;
	let target = safeRedirectPath(url.searchParams.get('next'));
	if (!account) {
		// Telegram shares no email; the placeholder is unique and never receives mail.
		[account] = await db
			.insert(accounts)
			.values({
				id: crypto.randomUUID(),
				email: `telegram-${user.id}@telegram.invalid`,
				accountType: 'user',
				telegramId: user.id
			})
			.returning();
		await db.insert(userProfiles).values({ accountId: account.id });
		target = '/welcome';
	}

	if (await ssoRequiredFor(account)) redirect(303, '/auth/sso?error=required');

	const token = generateSessionToken();
	const session = await createSession(token, account.id);
	cookies.set('session', token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		expires: session.expiresAt,
		path: '/'
	});
	redirect(303, target);
};
