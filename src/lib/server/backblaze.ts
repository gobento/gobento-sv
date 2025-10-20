// src/lib/server/backblaze.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
	// Force path-style addressing for Backblaze
	forcePathStyle: true
});

export async function uploadToBackblaze(file: File, key: string): Promise<string> {
	const buffer = Buffer.from(await file.arrayBuffer());

	const command = new PutObjectCommand({
		Bucket: BACKBLAZE_BUCKET_NAME,
		Key: key,
		Body: buffer,
		ContentType: file.type
	});

	await s3Client.send(command);

	// Return the key, not a URL (since bucket is private)
	// Frontend will request signed URLs via API
	return key;
}

export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
	const command = new PutObjectCommand({
		Bucket: BACKBLAZE_BUCKET_NAME,
		Key: key,
		ContentType: contentType
	});

	return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: BACKBLAZE_BUCKET_NAME,
		Key: key
	});

	return await getSignedUrl(s3Client, command, { expiresIn });
}
