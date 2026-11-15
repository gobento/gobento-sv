// src/lib/server/secretBox.ts
/**
 * Encrypts small secrets at rest (the client secrets of company SSO
 * connections) with AES-256-GCM under a key derived from SSO_SECRET_KEY.
 * Format: `v1.<iv>.<ciphertext+tag>`, both base64url.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { SSO_SECRET_KEY } from '$app/env/private';
import { isOfflineMode } from './mock';

function key(): Buffer | null {
	// The offline demo has no secrets worth protecting; use a fixed dev key.
	const material = SSO_SECRET_KEY || (isOfflineMode() ? 'gobento-offline-demo-key' : '');
	if (!material) return null;
	return createHash('sha256').update(`gobento-sso:${material}`).digest();
}

export function canStoreSecrets(): boolean {
	return key() !== null;
}

export function sealSecret(plain: string): string {
	const k = key();
	if (!k) throw new Error('SSO_SECRET_KEY is not configured');
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', k, iv);
	const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final(), cipher.getAuthTag()]);
	return `v1.${iv.toString('base64url')}.${body.toString('base64url')}`;
}

export function openSecret(sealed: string): string {
	const k = key();
	if (!k) throw new Error('SSO_SECRET_KEY is not configured');
	const [version, ivRaw, bodyRaw] = sealed.split('.');
	if (version !== 'v1' || !ivRaw || !bodyRaw) throw new Error('Unknown secret format');
	const body = Buffer.from(bodyRaw, 'base64url');
	const decipher = createDecipheriv('aes-256-gcm', k, Buffer.from(ivRaw, 'base64url'));
	decipher.setAuthTag(body.subarray(body.length - 16));
	return Buffer.concat([
		decipher.update(body.subarray(0, body.length - 16)),
		decipher.final()
	]).toString('utf8');
}
