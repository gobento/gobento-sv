// src/routes/(dock)/offers/[id]/schema.ts
import * as v from 'valibot';

export const txHashSchema = v.object({
	txHash: v.pipe(
		v.string(),
		v.minLength(1, 'Transaction hash is required'),
		v.regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format')
	)
});

export const initPaymentSchema = v.object({
	paymentMethod: v.picklist(['iban', 'tether'], 'Invalid payment method'),
	pickupDate: v.pipe(
		v.string(),
		v.minLength(1, 'Pickup date is required'),
		v.isoDate('Invalid date format')
	)
});

export type TxHashSchema = v.InferOutput<typeof txHashSchema>;
export type InitPaymentSchema = v.InferOutput<typeof initPaymentSchema>;
