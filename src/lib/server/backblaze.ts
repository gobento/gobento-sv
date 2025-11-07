// src/lib/server/backblaze.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
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

export interface ImageDimensions {
	width: number;
	height: number;
	fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
	quality?: number; // JPEG quality (1-100)
}

// Predefined image sizes
export const IMAGE_SIZES = {
	logo: { width: 96, height: 96, fit: 'cover' as const, quality: 90 },
	locationImage: { width: 420, height: 256, fit: 'cover' as const, quality: 85 }
} as const;

/**
 * Resize and optimize an image
 * @param buffer - Original image buffer
 * @param dimensions - Target dimensions and options
 * @returns Processed image buffer
 */
async function processImage(buffer: Buffer, dimensions: ImageDimensions): Promise<Buffer> {
	const { width, height, fit = 'cover', quality = 85 } = dimensions;

	let sharpInstance = sharp(buffer).resize(width, height, {
		fit,
		position: 'center',
		withoutEnlargement: false
	});

	// Auto-detect format and optimize
	const metadata = await sharp(buffer).metadata();

	if (metadata.format === 'png' && !metadata.hasAlpha) {
		// Convert PNG without transparency to JPEG for smaller size
		sharpInstance = sharpInstance.jpeg({ quality, progressive: true });
	} else if (metadata.format === 'png') {
		// Keep PNG with transparency, but optimize
		sharpInstance = sharpInstance.png({ compressionLevel: 9, progressive: true });
	} else {
		// Default to JPEG
		sharpInstance = sharpInstance.jpeg({ quality, progressive: true });
	}

	return await sharpInstance.toBuffer();
}

/**
 * Upload a file buffer to Backblaze B2
 * @param buffer - File buffer to upload
 * @param fileName - Original filename (for reference)
 * @param contentType - MIME type of the file
 * @param dimensions - Optional image dimensions for resizing
 * @returns Upload result with storage key
 */
export async function uploadFile(
	buffer: Buffer,
	fileName: string,
	contentType: string,
	dimensions?: ImageDimensions
): Promise<UploadResult> {
	try {
		let processedBuffer = buffer;
		let finalContentType = contentType;

		// Process image if dimensions provided and file is an image
		if (dimensions && contentType.startsWith('image/')) {
			try {
				processedBuffer = await processImage(buffer, dimensions);
				// Update content type based on processed image
				const metadata = await sharp(processedBuffer).metadata();
				finalContentType = `image/${metadata.format}`;
			} catch (error) {
				console.error('Image processing failed, using original:', error);
				// Continue with original buffer if processing fails
			}
		}

		// Generate unique key with file extension
		const extension = fileName.split('.').pop() || '';
		const uniqueKey = `${randomUUID()}.${extension}`;

		const command = new PutObjectCommand({
			Bucket: BACKBLAZE_BUCKET_NAME,
			Key: uniqueKey,
			Body: processedBuffer,
			ContentType: finalContentType,
			CacheControl: 'public, max-age=31536000, immutable',
			Metadata: {
				originalName: fileName,
				uploadedAt: new Date().toISOString(),
				...(dimensions && { resized: `${dimensions.width}x${dimensions.height}` })
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
 * Upload a file directly from FormData with optional resizing
 * @param file - File from form input
 * @param dimensions - Optional image dimensions for resizing
 * @returns Upload result with storage key
 */
export async function uploadFileFromForm(
	file: File,
	dimensions?: ImageDimensions
): Promise<UploadResult> {
	if (!file || file.size === 0) {
		return {
			success: false,
			key: '',
			error: 'No file provided or file is empty'
		};
	}

	// Validate file size (5MB limit for original)
	const maxSize = 5 * 1024 * 1024;
	if (file.size > maxSize) {
		return {
			success: false,
			key: '',
			error: 'File size exceeds 5MB limit'
		};
	}

	// Validate image type if dimensions provided
	if (dimensions && !file.type.startsWith('image/')) {
		return {
			success: false,
			key: '',
			error: 'File must be an image for resizing'
		};
	}

	// Convert to buffer
	const buffer = Buffer.from(await file.arrayBuffer());

	return uploadFile(buffer, file.name, file.type, dimensions);
}

/**
 * Upload image with predefined size preset
 * @param file - File from form input
 * @param sizePreset - Predefined size from IMAGE_SIZES
 * @returns Upload result with storage key
 */
export async function uploadImageWithPreset(
	file: File,
	sizePreset: keyof typeof IMAGE_SIZES
): Promise<UploadResult> {
	const dimensions = IMAGE_SIZES[sizePreset];
	return uploadFileFromForm(file, dimensions);
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
		ResponseCacheControl: 'public, max-age={' + expiresIn + '}, immutable'
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
