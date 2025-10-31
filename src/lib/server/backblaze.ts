// src/lib/server/backblaze.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { randomUUID } from 'crypto';
import {
	BACKBLAZE_KEY_ID,
	BACKBLAZE_APPLICATION_KEY,
	BACKBLAZE_BUCKET_NAME,
	BACKBLAZE_REGION,
	BACKBLAZE_ENDPOINT
} from '$env/static/private';

const s3Client = new S3Client({
	endpoint: BACKBLAZE_ENDPOINT,
	region: BACKBLAZE_REGION,
	credentials: {
		accessKeyId: BACKBLAZE_KEY_ID,
		secretAccessKey: BACKBLAZE_APPLICATION_KEY
	},
	forcePathStyle: true
});

export interface UploadResult {
	success: boolean;
	key: string;
	error?: string;
}

/**
 * Upload a file buffer to Backblaze B2
 * @param buffer - File buffer to upload
 * @param fileName - Original filename (for reference)
 * @param contentType - MIME type of the file
 * @returns Upload result with storage key
 */
export async function uploadFile(
	buffer: Buffer,
	fileName: string,
	contentType: string
): Promise<UploadResult> {
	try {
		// Generate unique key with file extension
		const extension = fileName.split('.').pop() || '';
		const uniqueKey = `${randomUUID()}.${extension}`;

		const command = new PutObjectCommand({
			Bucket: BACKBLAZE_BUCKET_NAME,
			Key: uniqueKey,
			Body: buffer,
			ContentType: contentType,
			// Add cache control headers for better performance
			CacheControl: 'public, max-age=31536000, immutable',
			// Optional: Add metadata
			Metadata: {
				originalName: fileName,
				uploadedAt: new Date().toISOString()
			}
		});

		await s3Client.send(command);

		return {
			success: true,
			key: uniqueKey
		};
	} catch (error) {
		console.error('Upload failed:', error);
		return {
			success: false,
			key: '',
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Upload a file directly from FormData
 * @param file - File from form input
 * @returns Upload result with storage key
 */
export async function uploadFileFromForm(file: File): Promise<UploadResult> {
	if (!file || file.size === 0) {
		return {
			success: false,
			key: '',
			error: 'No file provided or file is empty'
		};
	}

	// Validate file size (5MB limit)
	const maxSize = 5 * 1024 * 1024;
	if (file.size > maxSize) {
		return {
			success: false,
			key: '',
			error: 'File size exceeds 5MB limit'
		};
	}

	// Convert to buffer
	const buffer = Buffer.from(await file.arrayBuffer());

	return uploadFile(buffer, file.name, file.type);
}

export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
	const command = new PutObjectCommand({
		Bucket: BACKBLAZE_BUCKET_NAME,
		Key: key,
		ContentType: contentType,
		CacheControl: 'public, max-age=31536000, immutable'
	});

	return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

/**
 * Get signed download URL with extended expiration for caching
 * @param key - File key in B2
 * @param expiresIn - Expiration time in seconds (default: 7 days for better caching)
 * @returns Signed URL
 */
export async function getSignedDownloadUrl(
	key: string,
	expiresIn: number = 604800 // 7 days
): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: BACKBLAZE_BUCKET_NAME,
		Key: key,
		// Add response headers for better caching
		ResponseCacheControl: 'public, max-age=604800, immutable'
	});

	return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Get signed download URL with short expiration (for sensitive content)
 * @param key - File key in B2
 * @returns Signed URL with 1 hour expiration
 */
export async function getSignedDownloadUrlShort(key: string): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: BACKBLAZE_BUCKET_NAME,
		Key: key,
		ResponseCacheControl: 'public, max-age=3600'
	});

	return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
