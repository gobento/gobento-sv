import { redirect } from '@sveltejs/kit';

export const load = ({ locals, url }) => {
	// Redirect authenticated users away from signin/signup
	if (locals.user && (url.pathname === '/signin' || url.pathname === '/signup')) {
		throw redirect(302, '/');
	}
};
