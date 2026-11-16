// /src/routes/(dock)/analytics/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { getAnalyticsData } from '#lib/server/analytics.js';
import { parseAnalyticsDays, rangeLabel, type AnalyticsDays } from '#lib/analytics.js';
import { buildXlsx, type Sheet } from '#lib/server/xlsx.js';
import { error, fail } from '@sveltejs/kit';

function requireBusiness(locals: App.Locals): string {
	const account = locals.account!;
	if (account.accountType !== 'business') {
		throw error(403, 'Only business accounts can access analytics');
	}
	return account.id;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const businessAccountId = requireBusiness(locals);
	const days = parseAnalyticsDays(url.searchParams.get('days'));
	return getAnalyticsData(businessAccountId, days);
};

export const actions: Actions = {
	export: async ({ request, locals }) => {
		const businessAccountId = requireBusiness(locals);
		const formData = await request.formData();
		const days: AnalyticsDays = parseAnalyticsDays(String(formData.get('days') ?? ''));
		const data = await getAnalyticsData(businessAccountId, days);
		const label = rangeLabel(days);

		const sheets: Sheet[] = [
			{
				name: 'Overview',
				rows: [
					['Metric', `Value (${label.toLowerCase()})`],
					['Total Reservations', data.stats.totalReservations],
					['Total Revenue (€)', data.stats.totalRevenue],
					['Average Per Day', data.stats.avgPerDay.toFixed(1)],
					['Active Offers', data.stats.activeOffers],
					['Completion Rate (%)', data.stats.completionRate],
					['Favorites', data.stats.favoriteCount]
				]
			},
			{
				name: 'Reservations Over Time',
				rows: [
					['Date', 'Reservations', 'Revenue (€)'],
					...data.reservationsData.map((row) => [row.date, row.count, row.revenue])
				]
			},
			{
				name: 'Top Offers',
				rows: [
					['Offer', 'Reservations', 'Revenue (€)'],
					...data.offerPerformanceData.map((row) => [row.name, row.reservations, row.revenue])
				]
			},
			{
				name: 'Peak Pickup Hours',
				rows: [['Hour', 'Pickups'], ...data.peakHoursData.map((row) => [row.hour, row.pickups])]
			},
			{
				name: 'Location Performance',
				rows: [
					[
						'Location',
						'Address',
						'City',
						'Reservations',
						'Revenue (€)',
						'Completion Rate (%)',
						'Favorites'
					],
					...data.locationPerformanceData.map((row) => [
						row.name,
						row.address,
						row.city,
						row.totalReservations,
						row.revenue,
						row.completionRate,
						row.favoritesCount
					])
				]
			}
		];

		const workbook = buildXlsx(sheets);

		return {
			filename: `analytics-${data.days}d-${new Date().toISOString().slice(0, 10)}.xlsx`,
			xlsx: workbook.toString('base64')
		};
	}
};
