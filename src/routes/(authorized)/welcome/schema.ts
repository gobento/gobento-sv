// src/routes/welcome/schema.ts
import * as v from 'valibot';

// Validation schemas
const userSetupSchema = v.object({
	accountType: v.literal('user')
});

const businessSetupSchema = v.object({
	accountType: v.literal('business'),
	name: v.pipe(
		v.string(),
		v.minLength(1, 'Name is required'),
		v.maxLength(100, 'Name must be less than 100 characters')
	),
	description: v.pipe(
		v.string(),
		v.minLength(1, 'Description is required'),
		v.maxLength(500, 'Description must be less than 500 characters')
	),
	country: v.pipe(
		v.string(),
		v.minLength(1, 'Country is required'),
		v.maxLength(100, 'Country must be less than 100 characters')
	),
	businessType: v.pipe(
		v.picklist([
			'bakery',
			'restaurant',
			'cafe',
			'grocery',
			'supermarket',
			'hotel',
			'catering',
			'other'
		]),
		v.minLength(1, 'Business type is required')
	)
});

const charitySetupSchema = v.object({
	accountType: v.literal('charity'),
	name: v.pipe(
		v.string(),
		v.minLength(1, 'Name is required'),
		v.maxLength(100, 'Name must be less than 100 characters')
	),
	description: v.pipe(
		v.string(),
		v.minLength(1, 'Description is required'),
		v.maxLength(500, 'Description must be less than 500 characters')
	),
	country: v.pipe(
		v.string(),
		v.minLength(1, 'Country is required'),
		v.maxLength(100, 'Country must be less than 100 characters')
	)
});

// Union schema for all account types
export const welcomeSchema = v.variant('accountType', [
	userSetupSchema,
	businessSetupSchema,
	charitySetupSchema
]);
