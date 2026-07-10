// src/lib/server/admin.ts
import { error } from '@sveltejs/kit';
import type { Account } from '$lib/server/schema';

/**
 * Guards a page/endpoint so only `admin` accounts may proceed.
 * Throws a 403 for everyone else. Mirrors the `assertModerator` pattern used in
 * the moderation route.
 */
export function assertAdmin(account: Account | null): asserts account is Account {
	if (!account || account.accountType !== 'admin') {
		throw error(403, 'This page is only accessible by administrators');
	}
}
