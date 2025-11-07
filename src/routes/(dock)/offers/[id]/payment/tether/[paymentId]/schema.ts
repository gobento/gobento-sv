// src/routes/(dock)/offers/[id]/payment/tether/[paymentId]/schema.ts
import * as v from 'valibot';

export const txHashSchema = v.object({
	txHash: v.pipe(
		v.string(),
		v.minLength(1, 'Transaction hash is required'),
		v.regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format')
	),
	paymentId: v.pipe(
		v.string(),
		v.minLength(1, 'Payment ID is required'),
		v.uuid('Invalid payment ID format')
	)
});

export type TxHashSchema = v.InferOutput<typeof txHashSchema>;
