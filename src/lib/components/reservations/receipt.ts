import type { SubmitFunction } from '$app/forms';
import { toast } from '#lib/components/ui/toast.svelte.js';
import { downloadBase64Pdf } from '#lib/util.js';

function isReceipt(value: unknown): value is { base64: string; filename: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as Record<string, unknown>).base64 === 'string' &&
		typeof (value as Record<string, unknown>).filename === 'string'
	);
}

/**
 * `use:enhance` handler for the `downloadReceipt` form actions: saves the PDF
 * the action returns and reports failures as a toast.
 */
export function receiptSubmit(setPending: (pending: boolean) => void): SubmitFunction {
	return () => {
		setPending(true);
		return async ({ result }) => {
			setPending(false);
			if (result.type === 'success' && isReceipt(result.data?.receipt)) {
				downloadBase64Pdf(result.data.receipt.base64, result.data.receipt.filename);
				toast.success('Receipt downloaded');
			} else if (result.type === 'failure') {
				const message = result.data?.error;
				toast.error(typeof message === 'string' ? message : 'Could not create the receipt');
			} else {
				toast.error('Could not create the receipt. Please try again.');
			}
		};
	};
}
