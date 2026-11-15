import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const accountType = locals.account?.accountType;

	const home =
		accountType === 'moderator'
			? '/moderation'
			: accountType === 'admin'
				? '/admin'
				: accountType === 'business' || accountType === 'charity'
					? '/dashboard'
					: '/discover';

	throw redirect(307, home);
};
