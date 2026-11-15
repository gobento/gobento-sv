// src/routes/(public)/api/cron/recurring-gifts/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { materializeDueGifts } from '#lib/server/recurringGifts.js';

/**
 * Daily job (see vercel.json) that books the upcoming pickups of every active
 * regular gift. Pages that show gifts do the same lazily, so a missed run only
 * delays notifications. Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export const GET: RequestHandler = async ({ request }) => {
	const secret = process.env.CRON_SECRET;
	if (!secret) throw error(503, 'CRON_SECRET is not configured');
	if (request.headers.get('authorization') !== `Bearer ${secret}`) {
		throw error(401, 'Invalid cron secret');
	}

	const created = await materializeDueGifts();
	return json({ created });
};
