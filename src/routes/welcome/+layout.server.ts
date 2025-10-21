import { redirect } from '@sveltejs/kit';

export const load = ({ locals }) => {
	if (!locals.account || !locals.session) {
		throw redirect(302, '/auth/login');
	}

	// todo add support for ?next=url

	return {
		account: locals.account,
		session: locals.session
	};
};
