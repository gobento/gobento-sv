// Serves files from the in-memory mock storage. Only exists in mock mode.
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isOfflineMode } from '#lib/server/mock/index.js';
import { getMockFile } from '#lib/server/mock/storage.js';

export const prerender = false;

export const GET: RequestHandler = ({ params }) => {
	if (!isOfflineMode()) throw error(404, 'Not found');

	const file = getMockFile(params.key);
	if (!file) throw error(404, 'File not found');

	return new Response(file.body as BodyInit, {
		headers: {
			'content-type': file.contentType,
			'cache-control': 'public, max-age=3600'
		}
	});
};
