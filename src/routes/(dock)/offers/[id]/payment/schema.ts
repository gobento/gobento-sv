// src/routes/(dock)/offers/[id]/schema.ts
import * as v from 'valibot';

export const initPaymentSchema = v.object({
	paymentMethod: v.picklist(['iban', 'tether'], 'Invalid payment method'),
	pickupDate: v.pipe(
		v.string(),
		v.minLength(1, 'Pickup date is required'),
		v.isoDate('Invalid date format')
	)
});

export type InitPaymentSchema = v.InferOutput<typeof initPaymentSchema>;
