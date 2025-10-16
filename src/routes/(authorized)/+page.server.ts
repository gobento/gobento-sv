import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	return {
		user: locals.user,
		session: locals.session
	};
};
