// src/routes/welcome/schema.ts
import * as v from 'valibot';

const businessSchema = v.pipe(
	v.object({
		accountType: v.literal('business'),
		name: v.pipe(
			v.string('Name is required'),
			v.minLength(2, 'Name must be at least 2 characters'),
			v.maxLength(100, 'Name must be less than 100 characters')
		),
		description: v.pipe(
			v.string('Description is required'),
			v.minLength(10, 'Description must be at least 10 characters'),
			v.maxLength(500, 'Description must be less than 500 characters')
		),
		country: v.pipe(v.string('Country is required'), v.minLength(1, 'Please select a country')),
		businessType: v.picklist(
			['bakery', 'restaurant', 'cafe', 'grocery', 'supermarket', 'hotel', 'catering', 'other'],
			'Please select a valid business type'
		),
		paymentMethod: v.picklist(['iban', 'tether'], 'Please select a payment method'),
		ibanNumber: v.optional(v.pipe(v.string(), v.minLength(1, 'IBAN number is required'))),
		tetherAddress: v.optional(
			v.pipe(
				v.string(),
				v.minLength(42, 'Invalid Tether address'),
				v.maxLength(42, 'Invalid Tether address'),
				v.startsWith('0x', 'Tether address must start with 0x')
			)
		)
	}),
	v.check((data) => {
		if (data.paymentMethod === 'iban' && !data.ibanNumber) {
			return false;
		}
		if (data.paymentMethod === 'tether' && !data.tetherAddress) {
			return false;
		}
		return true;
	}, 'Please provide valid payment credentials for the selected method')
);

const charitySchema = v.pipe(
	v.object({
		accountType: v.literal('charity'),
		name: v.pipe(
			v.string('Name is required'),
			v.minLength(2, 'Name must be at least 2 characters'),
			v.maxLength(100, 'Name must be less than 100 characters')
		),
		description: v.pipe(
			v.string('Description is required'),
			v.minLength(10, 'Description must be at least 10 characters'),
			v.maxLength(500, 'Description must be less than 500 characters')
		),
		country: v.pipe(v.string('Country is required'), v.minLength(1, 'Please select a country')),
		paymentMethod: v.picklist(['iban', 'tether'], 'Please select a payment method'),
		ibanNumber: v.optional(v.pipe(v.string(), v.minLength(1, 'IBAN number is required'))),
		tetherAddress: v.optional(
			v.pipe(
				v.string(),
				v.minLength(42, 'Invalid Tether address'),
				v.maxLength(42, 'Invalid Tether address'),
				v.startsWith('0x', 'Tether address must start with 0x')
			)
		)
	}),
	v.check((data) => {
		if (data.paymentMethod === 'iban' && !data.ibanNumber) {
			return false;
		}
		if (data.paymentMethod === 'tether' && !data.tetherAddress) {
			return false;
		}
		return true;
	}, 'Please provide valid payment credentials for the selected method')
);

const userSchema = v.pipe(
	v.object({
		accountType: v.literal('user'),
		paymentMethod: v.picklist(['iban', 'tether'], 'Please select a payment method'),
		ibanNumber: v.optional(v.pipe(v.string(), v.minLength(1, 'IBAN number is required'))),
		tetherAddress: v.optional(
			v.pipe(
				v.string(),
				v.minLength(42, 'Invalid Tether address'),
				v.maxLength(42, 'Invalid Tether address'),
				v.startsWith('0x', 'Tether address must start with 0x')
			)
		)
	}),
	v.check((data) => {
		if (data.paymentMethod === 'iban' && !data.ibanNumber) {
			return false;
		}
		if (data.paymentMethod === 'tether' && !data.tetherAddress) {
			return false;
		}
		return true;
	}, 'Please provide valid payment credentials for the selected method')
);

export const welcomeSchema = v.union([userSchema, businessSchema, charitySchema]);
export type WelcomeSchema = v.InferOutput<typeof welcomeSchema>;
