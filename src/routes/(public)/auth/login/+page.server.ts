import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isOfflineMode } from '#lib/server/mock/index.js';
import { safeRedirectPath } from '#lib/navigation.js';

export const load: PageServerLoad = ({ locals, url }) => {
	const next = safeRedirectPath(url.searchParams.get('next'));

	if (locals.account && locals.session) {
		redirect(302, next);
	}

	return { next, demoAccounts: isOfflineMode() };
};
