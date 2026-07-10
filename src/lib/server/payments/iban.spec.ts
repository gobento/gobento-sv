// src/lib/server/payments/iban.spec.ts
import { describe, it, expect } from 'vitest';
import { isValidIban } from './iban';

describe('isValidIban', () => {
	it('accepts a valid IBAN', () => {
		expect(isValidIban('DE89 3704 0044 0532 0130 00')).toBe(true);
	});

	it('accepts a valid IBAN without whitespace', () => {
		expect(isValidIban('DE89370400440532013000')).toBe(true);
	});

	it('is case-insensitive', () => {
		expect(isValidIban('de89370400440532013000')).toBe(true);
	});

	it('accepts other valid country formats', () => {
		expect(isValidIban('GB82 WEST 1234 5698 7654 32')).toBe(true);
		expect(isValidIban('NL91 ABNA 0417 1643 00')).toBe(true);
	});

	it('rejects an IBAN with a bad check digit', () => {
		expect(isValidIban('DE88 3704 0044 0532 0130 00')).toBe(false);
	});

	it('rejects a structurally invalid value', () => {
		expect(isValidIban('NOT-AN-IBAN')).toBe(false);
		expect(isValidIban('12DE3704004405320130')).toBe(false);
	});

	it('rejects an empty string', () => {
		expect(isValidIban('')).toBe(false);
	});

	it('rejects a too-short value', () => {
		expect(isValidIban('DE89')).toBe(false);
	});
});
