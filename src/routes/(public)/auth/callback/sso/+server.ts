// src/routes/(public)/auth/callback/sso/+server.ts
import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db.js';
import { accounts, employees } from '#lib/server/schema.js';
import { and, eq } from 'drizzle-orm';
import { createSession, generateSessionToken } from '#lib/server/auth.js';
import { connectionFor, finishSignIn } from '#lib/server/sso.js';
import { safeRedirectPath } from '#lib/navigation.js';
import { safeEqual } from '#lib/pickupCode.js';

// Dynamic: the (public) group prerenders by default.
export const prerender = false;

interface Flow {
	state: string;
	codeVerifier: string;
	nonce: string;
	accountId: string;
	employerAccountId: string;
	next: string;
}

function readFlow(raw: string | undefined): Flow | null {
	if (!raw) return null;
	try {
		return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Flow;
	} catch {
		return null;
	}
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const flow = readFlow(cookies.get('sso_flow'));
	cookies.delete('sso_flow', { path: '/auth' });
	const back = (error: string) => redirect(303, `/auth/sso?error=${error}`);

	const state = url.searchParams.get('state');
	const code = url.searchParams.get('code');
	if (!flow) back('expired');
	if (!state || !code || !safeEqual(state, flow!.state)) back('failed');

	const connection = await connectionFor(flow!.employerAccountId);
	if (!connection?.enabled) back('disabled');

	let identity;
	try {
		identity = await finishSignIn(
			connection!,
			`${url.origin}/auth/callback/sso`,
			code!,
			flow!.codeVerifier,
			flow!.nonce
		);
	} catch (err) {
		console.error('SSO sign-in failed:', err instanceof Error ? err.message : err);
		back('failed');
	}

	// Only this organisation's own staff account can be signed into.
	const [staff] = await db
		.select({ email: accounts.email, ssoSubject: employees.ssoSubject })
		.from(employees)
		.innerJoin(accounts, eq(employees.accountId, accounts.id))
		.where(
			and(
				eq(employees.accountId, flow!.accountId),
				eq(employees.employerAccountId, flow!.employerAccountId),
				eq(accounts.accountType, 'employee')
			)
		)
		.limit(1);
	if (!staff) back('mismatch');

	if (staff!.ssoSubject) {
		// Pinned on first use: the same company identity every time.
		if (staff!.ssoSubject !== identity!.subject) back('mismatch');
	} else {
		if (identity!.email !== staff!.email || identity!.emailVerified === false) back('mismatch');
		await db
			.update(employees)
			.set({ ssoSubject: identity!.subject })
			.where(eq(employees.accountId, flow!.accountId));
	}

	const token = generateSessionToken();
	const session = await createSession(token, flow!.accountId);
	cookies.set('session', token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		expires: session.expiresAt,
		path: '/'
	});
	redirect(303, safeRedirectPath(flow!.next));
};
