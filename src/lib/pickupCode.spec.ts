import { describe, expect, it } from 'vitest';
import {
	checkPickupCode,
	checkPickupDigits,
	createPickupCode,
	parsePickupCode,
	pickupDigits
} from './pickupCode';

const token = 'CLAIM-7c8a0e5e-2b7f-4d1b-9a43-3f8a1c2b9d10';
const id = 'res-123';
const now = Date.UTC(2026, 10, 15, 18, 0, 0);

describe('pickup codes', () => {
	it('accepts a fresh code signed with the claim token', async () => {
		const code = parsePickupCode(await createPickupCode(token, id, now))!;
		expect(code.reservationId).toBe(id);
		expect(await checkPickupCode(code, token, now + 10_000)).toBe('ok');
	});

	it('rejects a code signed with a different token', async () => {
		const code = parsePickupCode(await createPickupCode('CLAIM-guess', id, now))!;
		expect(await checkPickupCode(code, token, now)).toBe('invalid');
	});

	it('rejects a code whose reservation id or time was edited', async () => {
		const raw = await createPickupCode(token, id, now);
		const [, , time, sig] = raw.split('.');
		const otherId = parsePickupCode(`GB1.res-999.${time}.${sig}`)!;
		expect(await checkPickupCode(otherId, token, now)).toBe('invalid');
		const laterTime = parsePickupCode(`GB1.${id}.${Number(time) + 600}.${sig}`)!;
		expect(await checkPickupCode(laterTime, token, now + 600_000)).toBe('invalid');
	});

	it('rejects an old screenshot', async () => {
		const code = parsePickupCode(await createPickupCode(token, id, now))!;
		expect(await checkPickupCode(code, token, now + 5 * 60_000)).toBe('expired');
	});

	it('ignores anything that is not a pickup code', () => {
		expect(parsePickupCode('CLAIM-7c8a0e5e')).toBeNull();
		expect(parsePickupCode('https://example.com')).toBeNull();
		expect(parsePickupCode('GB1.res.123.short')).toBeNull();
	});

	it('checks the 6-digit fallback with a little clock drift', async () => {
		const digits = await pickupDigits(token, id, now);
		expect(digits).toMatch(/^\d{6}$/);
		expect(await checkPickupDigits(digits, token, id, now + 25_000)).toBe(true);
		expect(await checkPickupDigits(digits, token, id, now + 5 * 60_000)).toBe(false);
		expect(await checkPickupDigits(digits, token, 'res-other', now)).toBe(false);
	});
});
