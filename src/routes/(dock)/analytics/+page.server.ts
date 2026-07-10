// /src/routes/(dock)/analytics/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { getAnalyticsData } from '$lib/server/analytics';
import { buildXlsx, type Sheet } from '$lib/server/xlsx';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	if (account.accountType !== 'business') {
		throw error(403, 'Only business accounts can access analytics');
	}

	return getAnalyticsData(account.id);
};

export const actions: Actions = {
	export: async ({ locals }) => {
		const account = locals.account!;

		if (account.accountType !== 'business') {
			return fail(403, { message: 'Only business accounts can export analytics' });
		}

		const data = await getAnalyticsData(account.id);

		const sheets: Sheet[] = [
			{
				name: 'Overview',
				rows: [
					['Metric', 'Value'],
					['Total Reservations (30d)', data.stats.totalReservations],
					['Total Revenue (30d)', data.stats.totalRevenue],
					['Average Per Day', data.stats.avgPerDay],
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
					['Offer', 'Reservations', 'Revenue (€)', 'Avg Rating'],
					...data.offerPerformanceData.map((row) => [
						row.name,
						row.reservations,
						row.revenue,
						row.avgRating
					])
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
						'Favorites',
						'Avg Rating'
					],
					...data.locationPerformanceData.map((row) => [
						row.name,
						row.address,
						row.city,
						row.totalReservations,
						row.revenue,
						row.completionRate,
						row.favoritesCount,
						row.avgRating
					])
				]
			}
		];

		const workbook = buildXlsx(sheets);

		return {
			filename: `analytics-${new Date().toISOString().slice(0, 10)}.xlsx`,
			xlsx: workbook.toString('base64')
		};
	}
};
