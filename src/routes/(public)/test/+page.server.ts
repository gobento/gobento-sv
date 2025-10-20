// src/routes/test-upload/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { uploadToBackblaze } from '$lib/server/backblaze';

export const actions: Actions = {
	upload: async ({ request }) => {
		try {
			const formData = await request.formData();

			// Debug: Log all form data entries
			console.log('FormData entries:');
			for (const [key, value] of formData.entries()) {
				if (value instanceof File) {
					console.log(
						`  ${key}: File(name="${value.name}", size=${value.size}, type="${value.type}")`
					);
				} else {
					console.log(`  ${key}: ${value}`);
				}
			}

			const file = formData.get('file');

			console.log('File value:', file);
			console.log('File instanceof File:', file instanceof File);

			if (!file || !(file instanceof File)) {
				console.error('No file in formData or not a File instance');
				return fail(400, { error: 'No file provided' });
			}

			if (file.size === 0) {
				console.error('File size is 0');
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

			// Generate unique filename
			const timestamp = Date.now();
			const fileExtension = file.name.split('.').pop();
			const fileName = `test-${timestamp}.${fileExtension}`;
			const key = `test-uploads/${fileName}`;

			console.log('Uploading file:', fileName);
			console.log('File size:', file.size, 'bytes');
			console.log('File type:', file.type);

			const uploadedKey = await uploadToBackblaze(file, key);

			console.log('Upload successful! Key:', uploadedKey);

			const proxyUrl = `/api/image/${encodeURIComponent(uploadedKey)}`;

			return {
				success: true,
				url: proxyUrl,
				fileName,
				key: uploadedKey
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
