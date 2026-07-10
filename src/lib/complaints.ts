// src/lib/complaints.ts
import * as v from 'valibot';

export const COMPLAINT_CATEGORIES = [
	'quality',
	'expired',
	'unavailable',
	'incorrect_info',
	'hygiene',
	'other'
] as const;

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
	quality: 'Poor quality',
	expired: 'Expired or spoiled food',
	unavailable: 'Offer was not available',
	incorrect_info: 'Incorrect information',
	hygiene: 'Hygiene concern',
	other: 'Something else'
};

export const complaintSchema = v.object({
	category: v.picklist(COMPLAINT_CATEGORIES, 'Please choose a category'),
	message: v.pipe(
		v.string('Please describe the problem'),
		v.trim(),
		v.minLength(10, 'Please provide at least 10 characters'),
		v.maxLength(1000, 'Please keep your message under 1000 characters')
	)
});

export type ComplaintSchema = v.InferOutput<typeof complaintSchema>;
