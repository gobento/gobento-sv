// src/lib/server/payments/iban.ts
/**
 * IBAN validation utilities.
 *
 * Intentionally free of any SvelteKit / environment imports so the logic can be
 * unit tested in isolation (the test runner does not resolve `$env`/`$lib`).
 */

/**
 * Structural + mod-97 checksum validation of an IBAN.
 * Accepts values with or without whitespace grouping.
 */
export function isValidIban(raw: string): boolean {
	const iban = raw.replace(/\s+/g, '').toUpperCase();

	// Two letter country code, two check digits, then the BBAN.
	if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) {
		return false;
	}

	// Move the first four characters to the end.
	const rearranged = iban.slice(4) + iban.slice(0, 4);

	// Replace each letter with its two digit value (A = 10 ... Z = 35).
	const numeric = rearranged.replace(/[A-Z]/g, (ch) => (ch.charCodeAt(0) - 55).toString());

	// Compute mod-97 iteratively to avoid BigInt overflow on long IBANs.
	let remainder = 0;
	for (const digit of numeric) {
		remainder = (remainder * 10 + Number(digit)) % 97;
	}

	return remainder === 1;
}
