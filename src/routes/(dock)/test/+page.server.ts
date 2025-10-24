// src/routes/(public)/test/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { uploadFileFromForm } from '$lib/server/backblaze';
import { db } from '$lib/server/db';
import { files } from '$lib/server/schema';

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		try {
			// Check authentication - require logged in user
			if (!locals.account) {
				return fail(401, { error: 'You must be logged in to upload files' });
			}

			const formData = await request.formData();
			const file = formData.get('file');

			if (!file || !(file instanceof File)) {
				return fail(400, { error: 'No file provided' });
			}

			if (file.size === 0) {
				return fail(400, { error: 'File is empty' });
			}

			// Validate file type
			if (!file.type.startsWith('image/')) {
				return fail(400, { error: 'File must be an image' });
			}

			// Validate file size (max 5MB)
			const maxSize = 5 * 1024 * 1024;
			if (file.size > maxSize) {
				return fail(400, { error: 'File size must be less than 5MB' });
			}

			console.log('Uploading file:', file.name);
			console.log('File size:', file.size, 'bytes');

			// Upload to Backblaze using the correct function
			const uploadResult = await uploadFileFromForm(file);

			if (!uploadResult.success) {
				return fail(500, { error: uploadResult.error || 'Upload failed' });
			}

			// Generate unique file ID and use storage key from upload
			const fileId = crypto.randomUUID();
			const storageKey = uploadResult.key;

			console.log('Storage key:', storageKey);

			// Save file record to database
			await db.insert(files).values({
				id: fileId,
				key: storageKey,
				fileName: file.name,
				contentType: file.type,
				sizeBytes: file.size,
				uploadedBy: locals.account.id
			});

			console.log('Upload successful! File ID:', fileId);

			// Return proxy URL for signed URL generation
			const proxyUrl = `/api/file/${fileId}`;

			return {
				success: true,
				url: proxyUrl,
				fileName: file.name,
				key: fileId // Return file ID, not storage key
			};
		} catch (error) {
			console.error('Upload error:', error);
			if (error instanceof Error) {
				return fail(500, { error: `Upload failed: ${error.message}` });
			}
			return fail(500, { error: 'Failed to upload file' });
		}
	}
};
