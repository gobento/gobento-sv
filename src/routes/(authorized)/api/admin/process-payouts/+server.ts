// src/routes/api/admin/process-payouts/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SettlementService } from '$lib/server/payments/settlement';

/**
 * Admin endpoint to process monthly payouts
 * Should be called by a cron job at the end of each month
 *
 * Example cron schedule (runs on the 1st of each month at 2 AM):
 * 0 2 1 * * (crontab format)
 *
 * Or use a service like:
 * - Vercel Cron Jobs
 * - GitHub Actions with scheduled workflows
 * - cron-job.org
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const account = locals.account!;

	try {
		// Verify admin access
		if (account.accountType !== 'admin') {
			throw error(403, 'Only admins can process payouts');
		}

		// Verify cron secret if using external cron service
		const authHeader = request.headers.get('authorization');
		const expectedSecret = process.env.CRON_SECRET;

		if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
			throw error(401, 'Invalid cron secret');
		}

		// Get previous month
		const now = new Date();
		const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const month = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
		const year = lastMonth.getFullYear();

		console.log(`Processing payouts for ${month}...`);

		// Process all settlements for the month
		const result = await SettlementService.processMonthlyPayouts(month, year);

		if (!result.success) {
			console.error('Some payouts failed:', result.errors);

			// TODO: Send alert to admin
			// await sendAdminAlert({
			//   type: 'payout_failures',
			//   month,
			//   year,
			//   failures: result.errors
			// });
		}

		return json({
			success: result.success,
			month,
			year,
			processed: result.processed,
			failed: result.failed,
			errors: result.errors
		});
	} catch (error) {
		console.error('Payout processing error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

// Alternative: GET endpoint for manual triggering
export const GET: RequestHandler = async ({ url, locals }) => {
	const account = locals.account!;

	// Verify admin access
	if (account.accountType !== 'admin') {
		throw error(403, 'Only admins can trigger payouts');
	}

	const month = url.searchParams.get('month');
	const yearParam = url.searchParams.get('year');

	if (!month || !yearParam) {
		throw error(400, 'Month and year required');
	}

	const year = parseInt(yearParam);

	const result = await SettlementService.processMonthlyPayouts(month, year);

	return json({
		success: result.success,
		month,
		year,
		processed: result.processed,
		failed: result.failed,
		errors: result.errors
	});
};
