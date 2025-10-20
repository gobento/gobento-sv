// src/routes/api/image/[...key]/+server.ts
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSignedDownloadUrl } from '$lib/server/backblaze';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const { key } = params;

	if (!key) {
		throw error(400, 'Image key is required');
	}

	try {
		// Generate signed URL valid for 1 hour
		const signedUrl = await getSignedDownloadUrl(key, 3600);

		// Fetch the image from Backblaze
		const response = await fetch(signedUrl);

		if (!response.ok) {
			throw error(response.status, 'Failed to fetch image from storage');
		}

		// Get the image data and content type
		const imageBuffer = await response.arrayBuffer();
		const contentType = response.headers.get('content-type') || 'image/jpeg';

		// Return the image directly
		return new Response(imageBuffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (err) {
		console.error('Error serving image:', err);
		throw error(500, 'Failed to load image');
	}
};
