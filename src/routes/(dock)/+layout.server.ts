import { redirect } from '@sveltejs/kit';

export const load = ({ locals, url }) => {
	if (!locals.account || !locals.session) {
		// Come back to the page that was asked for (e.g. an invite link) after signing in.
		const next = url.pathname + url.search;
		throw redirect(302, next === '/' ? '/auth/login' : `/auth/login?next=${encodeURIComponent(next)}`);
	}

	return {
		account: locals.account,
		session: locals.session
	};
};
