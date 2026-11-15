// src/lib/server/telegramAuth.ts
/**
 * Verifies data from the Telegram Login Widget
 * (https://core.telegram.org/widgets/login#checking-authorization):
 * the hash is HMAC-SHA256 over the sorted `key=value` lines, keyed with the
 * SHA-256 of the bot token. Only Telegram and we know the token.
 */
import { createHash, createHmac, timingSafeEqual } from 'crypto';

/** A login older than this is refused, so a leaked callback URL can't be replayed later. */
export const MAX_LOGIN_AGE_S = 10 * 60;

export interface TelegramUser {
	id: string;
	firstName: string | null;
	username: string | null;
}

const FIELDS = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date', 'hash'];

export function telegramHash(data: Record<string, string>, botToken: string): string {
	const checkString = Object.keys(data)
		.filter((key) => key !== 'hash')
		.sort()
		.map((key) => `${key}=${data[key]}`)
		.join('\n');
	const secret = createHash('sha256').update(botToken).digest();
	return createHmac('sha256', secret).update(checkString).digest('hex');
}

/** The Telegram user when `params` are genuine and fresh, otherwise null. */
export function verifyTelegramLogin(
	params: URLSearchParams,
	botToken: string,
	nowMs = Date.now()
): TelegramUser | null {
	if (!botToken) return null;
	const data: Record<string, string> = {};
	for (const key of FIELDS) {
		const value = params.get(key);
		if (value !== null) data[key] = value;
	}
	const hash = data.hash;
	if (!hash || !/^[0-9a-f]{64}$/.test(hash) || !/^\d+$/.test(data.id ?? '')) return null;

	const expected = Buffer.from(telegramHash(data, botToken), 'hex');
	if (!timingSafeEqual(expected, Buffer.from(hash, 'hex'))) return null;

	const authDate = Number(data.auth_date);
	if (!Number.isFinite(authDate)) return null;
	const age = nowMs / 1000 - authDate;
	if (age > MAX_LOGIN_AGE_S || age < -60) return null;

	return { id: data.id, firstName: data.first_name ?? null, username: data.username ?? null };
}
