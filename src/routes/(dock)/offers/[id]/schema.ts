import * as v from 'valibot';

export const txHashSchema = v.object({
	txHash: v.pipe(
		v.string('Transaction hash is required'),
		v.minLength(1, 'Transaction hash is required'),
		v.regex(
			/^0x[a-fA-F0-9]{64}$/,
			'Invalid transaction hash format (must be 0x followed by 64 hex characters)'
		)
	)
});
