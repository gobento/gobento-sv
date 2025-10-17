import { redirect } from '@sveltejs/kit';

export const load = ({ locals }) => {
	if (!locals.user || !locals.session) {
		throw redirect(302, '/auth/login');
	}

	// todo add support for ?next=url

	return {
		user: locals.user,
		session: locals.session
	};
};
