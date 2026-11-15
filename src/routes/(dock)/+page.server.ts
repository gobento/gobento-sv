import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { homeFor } from '#lib/navigation.js';

// `/` has no content of its own: send each role to its home screen.
export const load: PageServerLoad = async ({ locals }) => {
	redirect(307, homeFor(locals.account?.accountType));
};
