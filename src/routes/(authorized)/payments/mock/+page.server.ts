// src/routes/payments/mock/+page.server.ts

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { MOCK_PAYMENTS } from '$env/static/private';

export const load: PageServerLoad = async ({ url }) => {
	// Only allow in mock mode
	if (MOCK_PAYMENTS !== 'true') {
		throw error(404, 'Not found');
	}

	const authority = url.searchParams.get('authority');
	const paymentId = url.searchParams.get('paymentId');

	if (!authority) {
		throw error(400, 'Missing authority parameter');
	}

	// In a real implementation, you'd fetch the payment details
	// For mock, we'll return dummy data
	return {
		authority,
		paymentId: paymentId || 'unknown',
		amount: 50000 // Mock amount
	};
};
