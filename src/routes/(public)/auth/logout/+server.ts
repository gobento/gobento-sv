import { redirect } from '@sveltejs/kit';
import { invalidateSession } from '#lib/server/auth.js';
import type { RequestEvent, RequestHandler } from './$types';

async function signOut({ locals, cookies }: RequestEvent): Promise<never> {
	if (locals.session) {
		await invalidateSession(locals.session.id);
	}

	cookies.delete('session', { path: '/' });
	redirect(303, '/auth/login');
}

// Preferred: a form POST, which SvelteKit's origin check protects against CSRF.
export const POST: RequestHandler = (event) => signOut(event);

// Plain links still work, but a GET fired from another site (an <img>, a link in
// a mail, a redirect) must not be able to sign somebody out.
export const GET: RequestHandler = (event) => {
	const site = event.request.headers.get('sec-fetch-site');
	if (site === 'cross-site') {
		redirect(303, '/');
	}
	return signOut(event);
};
