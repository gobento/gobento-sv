// src/lib/complaints.spec.ts
import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { complaintSchema, COMPLAINT_CATEGORIES, COMPLAINT_CATEGORY_LABELS } from './complaints';

describe('complaintSchema', () => {
	it('accepts a valid complaint', () => {
		const result = v.safeParse(complaintSchema, {
			category: 'quality',
			message: 'The bread was stale and inedible.'
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.output.category).toBe('quality');
		}
	});

	it('trims the message', () => {
		const result = v.safeParse(complaintSchema, {
			category: 'other',
			message: '   The food was not as described.   '
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.output.message).toBe('The food was not as described.');
		}
	});

	it('rejects a message that is too short', () => {
		const result = v.safeParse(complaintSchema, {
			category: 'expired',
			message: 'bad'
		});

		expect(result.success).toBe(false);
	});

	it('rejects a message longer than 1000 characters', () => {
		const result = v.safeParse(complaintSchema, {
			category: 'hygiene',
			message: 'a'.repeat(1001)
		});

		expect(result.success).toBe(false);
	});

	it('rejects an unknown category', () => {
		const result = v.safeParse(complaintSchema, {
			category: 'not-a-real-category',
			message: 'This category does not exist.'
		});

		expect(result.success).toBe(false);
	});

	it('has a label for every category', () => {
		for (const category of COMPLAINT_CATEGORIES) {
			expect(COMPLAINT_CATEGORY_LABELS[category]).toBeTruthy();
		}
	});
});
