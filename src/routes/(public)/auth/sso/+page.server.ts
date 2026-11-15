// src/routes/(public)/auth/sso/+page.server.ts
/** Company sign-in: staff enter their work email and go to their organisation's provider. */
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { generateCodeVerifier, generateState } from 'arctic';
import { db } from '#lib/server/db.js';
import { accounts, employees } from '#lib/server/schema.js';
import { and, eq } from 'drizzle-orm';
import { safeRedirectPath } from '#lib/navigation.js';
import { authorizationUrl, connectionFor } from '#lib/server/sso.js';

// Dynamic: the (public) group prerenders by default.
export const prerender = false;

const SSO_FLOW_COOKIE = 'sso_flow';

const ERRORS: Record<string, string> = {
	failed: 'Company sign-in did not complete. Please try again.',
	mismatch:
		'Your company account does not match this Go Bento staff account. Ask whoever manages your team to check the email address.',
	expired: 'The sign-in took too long. Please start again.',
	disabled: 'Company sign-in has been turned off for your team.',
	required: 'Your team requires company sign-in. Enter your work email to continue.'
};

export const load: PageServerLoad = ({ url, locals }) => {
	const next = safeRedirectPath(url.searchParams.get('next'));
	if (locals.account) redirect(302, next);
	const code = url.searchParams.get('error');
	return { next, error: code ? (ERRORS[code] ?? ERRORS.failed) : null };
};

export const actions: Actions = {
	default: async ({ request, url, cookies }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '')
			.trim()
			.toLowerCase();
		const next = safeRedirectPath(String(formData.get('next') ?? ''));
		// One answer for every "no" so the form can't be used to look up who works where.
		const notAvailable = fail(400, {
			email,
			error:
				'Company sign-in is not set up for this email. Use the sign-in method your team gave you, or ask your manager.'
		});

		if (!/^[^\s@]+@[^\s@]+$/.test(email)) return notAvailable;

		const [staff] = await db
			.select({ accountId: accounts.id, employerAccountId: employees.employerAccountId })
			.from(accounts)
			.innerJoin(employees, eq(employees.accountId, accounts.id))
			.where(and(eq(accounts.email, email), eq(accounts.accountType, 'employee')))
			.limit(1);
		if (!staff) return notAvailable;

		const connection = await connectionFor(staff.employerAccountId);
		if (!connection?.enabled) return notAvailable;

		const flow = {
			state: generateState(),
			codeVerifier: generateCodeVerifier(),
			nonce: generateState(),
			accountId: staff.accountId,
			employerAccountId: staff.employerAccountId,
			next
		};

		let target: URL;
		try {
			target = await authorizationUrl(connection, `${url.origin}/auth/callback/sso`, {
				...flow,
				loginHint: email
			});
		} catch (err) {
			console.error('SSO discovery failed:', err instanceof Error ? err.message : err);
			return fail(502, {
				email,
				error: "Your company's sign-in service can't be reached right now. Please try again later."
			});
		}

		cookies.set(SSO_FLOW_COOKIE, Buffer.from(JSON.stringify(flow)).toString('base64url'), {
			path: '/auth',
			httpOnly: true,
			secure: import.meta.env.PROD,
			sameSite: 'lax',
			maxAge: 60 * 10
		});
		// The provider was checked when the owner saved it; only its authorization endpoint is used.
		redirect(303, target.toString(), { external: [target.origin] });
	}
};
