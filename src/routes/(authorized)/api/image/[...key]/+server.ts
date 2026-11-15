import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db.js';
import { files } from '#lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { getSignedDownloadUrl } from '#lib/server/backblaze.js';

export const GET: RequestHandler = async ({ params }) => {
	const fileId = params.key;

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

		// Generate signed URL
		const signedUrl = await getSignedDownloadUrl(fileRecord.key);

		// Redirect to signed URL
		// Signed bucket URLs (or the mock-file route) are on another origin.
		throw redirect(302, signedUrl, { external: true });
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		console.error('Error generating signed URL:', err);
		throw error(500, 'Failed to retrieve file');
	}
};
