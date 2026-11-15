import { describe, expect, it } from 'vitest';
import { telegramHash, verifyTelegramLogin } from './telegramAuth';

const token = '123456:TEST-token';
const now = Date.UTC(2026, 10, 15, 18, 0, 0);

function signed(data: Record<string, string>, key = token) {
	return new URLSearchParams({ ...data, hash: telegramHash(data, key) });
}
const base = { id: '424242', first_name: 'Mia', username: 'mia', auth_date: String(now / 1000 - 30) };

describe('verifyTelegramLogin', () => {
	it('accepts genuine, fresh data', () => {
		expect(verifyTelegramLogin(signed(base), token, now)).toEqual({
			id: '424242',
			firstName: 'Mia',
			username: 'mia'
		});
	});

	it('rejects data signed with another bot token', () => {
		expect(verifyTelegramLogin(signed(base, '999:other'), token, now)).toBeNull();
	});

	it('rejects edited fields', () => {
		const params = signed(base);
		params.set('id', '1');
		expect(verifyTelegramLogin(params, token, now)).toBeNull();
	});

	it('rejects a replay after ten minutes', () => {
		expect(verifyTelegramLogin(signed(base), token, now + 11 * 60_000)).toBeNull();
	});

	it('rejects everything when no token is configured', () => {
		expect(verifyTelegramLogin(signed(base, ''), '', now)).toBeNull();
	});
});
