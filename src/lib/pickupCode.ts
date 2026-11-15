// src/lib/pickupCode.ts
/**
 * Pickup codes that can't be faked or replayed.
 *
 * The customer's phone shows a QR code `GB1.<reservationId>.<time>.<signature>`
 * where the signature is an HMAC-SHA256 over id and time, keyed with the
 * reservation's secret claim token. Only the server and the people allowed to
 * collect the order know that token, so:
 *
 * - a code someone types into a QR generator has no valid signature,
 * - a screenshot stops working after `MAX_AGE_S` because the time is signed,
 * - a code that was already redeemed fails because redemption is atomic.
 *
 * When scanning is not possible, the phone also shows 6 digits derived the same
 * way from the current 30-second step; staff pick the order from the list and
 * type the digits.
 *
 * Signing uses WebCrypto so the phone can refresh codes offline; verification
 * happens only on the server.
 */

export const CODE_PREFIX = 'GB1';
/** How often the phone draws a fresh QR code. */
export const REFRESH_S = 15;
/** How old (or how far in the future, for clock drift) a scanned code may be. */
export const MAX_AGE_S = 90;
/** Step length of the 6-digit fallback code. */
export const DIGIT_STEP_S = 30;

const encoder = new TextEncoder();

async function hmac(secret: string, message: string): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

function base64url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Constant-time string comparison, so timing doesn't leak a valid signature. */
export function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

/** 128 bits of the HMAC: plenty against guessing, keeps the QR code small. */
async function signature(claimToken: string, reservationId: string, time: number): Promise<string> {
	const mac = await hmac(claimToken, `${CODE_PREFIX}.${reservationId}.${time}`);
	return base64url(mac.slice(0, 16));
}

/** The QR payload for `nowMs` (pass a server-corrected clock). */
export async function createPickupCode(
	claimToken: string,
	reservationId: string,
	nowMs: number
): Promise<string> {
	const time = Math.floor(nowMs / 1000);
	return `${CODE_PREFIX}.${reservationId}.${time}.${await signature(claimToken, reservationId, time)}`;
}

/** 6 digits for the step containing `nowMs`. */
export async function pickupDigits(
	claimToken: string,
	reservationId: string,
	nowMs: number
): Promise<string> {
	const step = Math.floor(nowMs / 1000 / DIGIT_STEP_S);
	const mac = await hmac(claimToken, `${CODE_PREFIX}D.${reservationId}.${step}`);
	// RFC 4226 dynamic truncation
	const offset = mac[mac.length - 1] & 0x0f;
	const value =
		((mac[offset] & 0x7f) << 24) |
		(mac[offset + 1] << 16) |
		(mac[offset + 2] << 8) |
		mac[offset + 3];
	return String(value % 1_000_000).padStart(6, '0');
}

export interface ParsedCode {
	reservationId: string;
	time: number;
	signature: string;
}

/** Splits a scanned payload; null for anything that isn't one of our codes. */
export function parsePickupCode(raw: string): ParsedCode | null {
	const parts = raw.trim().split('.');
	if (parts.length !== 4 || parts[0] !== CODE_PREFIX) return null;
	const [, reservationId, timeRaw, sig] = parts;
	if (!/^[A-Za-z0-9-]{1,64}$/.test(reservationId)) return null;
	if (!/^\d{9,11}$/.test(timeRaw)) return null;
	if (!/^[A-Za-z0-9_-]{22}$/.test(sig)) return null;
	return { reservationId, time: Number(timeRaw), signature: sig };
}

export type CodeCheck = 'ok' | 'invalid' | 'expired';

/** Server side: is this a genuine, fresh code for the reservation with `claimToken`? */
export async function checkPickupCode(
	code: ParsedCode,
	claimToken: string,
	nowMs: number
): Promise<CodeCheck> {
	const expected = await signature(claimToken, code.reservationId, code.time);
	if (!safeEqual(expected, code.signature)) return 'invalid';
	if (Math.abs(nowMs / 1000 - code.time) > MAX_AGE_S) return 'expired';
	return 'ok';
}

/** Server side: do the typed digits match the current (or a neighbouring) step? */
export async function checkPickupDigits(
	digits: string,
	claimToken: string,
	reservationId: string,
	nowMs: number
): Promise<boolean> {
	if (!/^\d{6}$/.test(digits)) return false;
	let match = false;
	// One step either side covers clock drift and slow typing; check all three
	// so the time taken doesn't reveal which one matched.
	for (const delta of [-1, 0, 1]) {
		const candidate = await pickupDigits(
			claimToken,
			reservationId,
			nowMs + delta * DIGIT_STEP_S * 1000
		);
		match = safeEqual(candidate, digits) || match;
	}
	return match;
}
