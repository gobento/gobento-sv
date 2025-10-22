// src/routes/api/file/[id]/+server.ts
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { files } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getSignedDownloadUrl } from '$lib/server/backblaze';

export const GET: RequestHandler = async ({ params }) => {
	const fileId = params.id;

	if (!fileId) {
		throw error(400, 'File ID required');
	}

	try {
		// Look up file in database
		const fileRecord = await db.query.files.findFirst({
			where: eq(files.id, fileId)
		});

		if (!fileRecord) {
			throw error(404, 'File not found');
		}

		// Generate signed URL (valid for 1 hour)
		const signedUrl = await getSignedDownloadUrl(fileRecord.key, 3600);

		// Redirect to signed URL
		throw redirect(302, signedUrl);
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		console.error('Error generating signed URL:', err);
		throw error(500, 'Failed to retrieve file');
	}
};
