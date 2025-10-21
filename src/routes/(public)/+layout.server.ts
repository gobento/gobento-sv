import { redirect } from '@sveltejs/kit';

export const load = ({ locals, url }) => {
	// Redirect authenticated accounts away from signin/signup
	if (locals.account && (url.pathname === '/signin' || url.pathname === '/signup')) {
		throw redirect(302, '/');
	}
};
