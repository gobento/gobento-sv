import { redirect } from '@sveltejs/kit';

export const load = ({ locals, url }) => {
	// Redirect authenticated users away from signin/signup
	if (locals.user && (url.pathname === '/signin' || url.pathname === '/signup')) {
		throw redirect(302, '/');
	}
};

//  prerendered content can only be updated by building and deploying a new version of the application.
export const prerender = true;
