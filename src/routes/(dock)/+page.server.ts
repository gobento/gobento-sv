import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	return {
		account: locals.account,
		session: locals.session
	};
};
