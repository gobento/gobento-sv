import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	console.log('🔍 User - Loading user:', locals);

	if (!locals.user) {
		throw redirect(302, `/auth/login?next=${encodeURIComponent(url.pathname)}`);
	}

	const userResult = await db.select().from(users).where(eq(users.id, locals.user.id)).limit(1);

	if (!userResult[0]) {
		throw error(404, 'User not found');
	}

	// If there's a pending edit, use its values; otherwise use station values
	return {
		user: userResult[0],
		isAdmin: locals.user.isAdmin
	};
};
