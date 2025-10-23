<!-- +page.svelte -->
<script lang="ts">
	import {
		Chart,
		Svg,
		Tooltip,
		Group,
		Area,
		LinearGradient,
		AxisX,
		AxisY,
		Highlight,
		Labels,
		RectClipPath
	} from 'layerchart';
	import { PeriodType, format } from 'svelte-ux';
	import { scaleTime, scaleLinear } from 'd3-scale';
	import IconChartLine from '~icons/fluent/chart-line-20-filled';
	import IconMoney from '~icons/fluent/money-20-filled';
	import IconBox from '~icons/fluent/box-20-filled';
	import IconPeople from '~icons/fluent/people-20-filled';
	import IconStar from '~icons/fluent/star-20-filled';
	import IconClock from '~icons/fluent/clock-20-filled';

	// Sample data - in real app, fetch from your API
	let reservationsData = $state([
		{ date: new Date('2024-10-01'), count: 45, revenue: 450 },
		{ date: new Date('2024-10-02'), count: 52, revenue: 520 },
		{ date: new Date('2024-10-03'), count: 38, revenue: 380 },
		{ date: new Date('2024-10-04'), count: 61, revenue: 610 },
		{ date: new Date('2024-10-05'), count: 73, revenue: 730 },
		{ date: new Date('2024-10-06'), count: 85, revenue: 850 },
		{ date: new Date('2024-10-07'), count: 92, revenue: 920 },
		{ date: new Date('2024-10-08'), count: 68, revenue: 680 },
		{ date: new Date('2024-10-09'), count: 55, revenue: 550 },
		{ date: new Date('2024-10-10'), count: 47, revenue: 470 },
		{ date: new Date('2024-10-11'), count: 58, revenue: 580 },
		{ date: new Date('2024-10-12'), count: 71, revenue: 710 },
		{ date: new Date('2024-10-13'), count: 88, revenue: 880 },
		{ date: new Date('2024-10-14'), count: 95, revenue: 950 },
		{ date: new Date('2024-10-15'), count: 82, revenue: 820 },
		{ date: new Date('2024-10-16'), count: 76, revenue: 760 },
		{ date: new Date('2024-10-17'), count: 64, revenue: 640 },
		{ date: new Date('2024-10-18'), count: 59, revenue: 590 },
		{ date: new Date('2024-10-19'), count: 70, revenue: 700 },
		{ date: new Date('2024-10-20'), count: 84, revenue: 840 },
		{ date: new Date('2024-10-21'), count: 91, revenue: 910 },
		{ date: new Date('2024-10-22'), count: 98, revenue: 980 },
		{ date: new Date('2024-10-23'), count: 87, revenue: 870 }
	]);

	let offerPerformanceData = $state([
		{ name: 'Breakfast Surprise', reservations: 234, revenue: 2340, avgRating: 4.5 },
		{ name: 'Lunch Box', reservations: 187, revenue: 1870, avgRating: 4.3 },
		{ name: 'Dinner Deal', reservations: 156, revenue: 1560, avgRating: 4.7 },
		{ name: 'Bakery Bundle', reservations: 142, revenue: 1420, avgRating: 4.2 },
		{ name: 'Fresh Produce', reservations: 98, revenue: 980, avgRating: 4.6 }
	]);

	let peakHoursData = $state([
		{ hour: '08:00', pickups: 12 },
		{ hour: '09:00', pickups: 28 },
		{ hour: '10:00', pickups: 35 },
		{ hour: '11:00', pickups: 42 },
		{ hour: '12:00', pickups: 58 },
		{ hour: '13:00', pickups: 51 },
		{ hour: '14:00', pickups: 38 },
		{ hour: '15:00', pickups: 29 },
		{ hour: '16:00', pickups: 44 },
		{ hour: '17:00', pickups: 67 },
		{ hour: '18:00', pickups: 73 },
		{ hour: '19:00', pickups: 52 },
		{ hour: '20:00', pickups: 31 }
	]);

	// Stats calculations
	let stats = $derived({
		totalReservations: reservationsData.reduce((sum, d) => sum + d.count, 0),
		totalRevenue: reservationsData.reduce((sum, d) => sum + d.revenue, 0),
		avgPerDay: Math.round(
			reservationsData.reduce((sum, d) => sum + d.count, 0) / reservationsData.length
		),
		activeOffers: 12,
		completionRate: 87,
		favoriteCount: 342
	});
</script>

<div class="min-h-screen bg-base-200 p-6">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold">Business Analytics</h1>
				<p class="mt-1 text-base-content/60">Track your performance and insights</p>
			</div>
			<select class="select-bordered select">
				<option>Last 30 Days</option>
				<option>Last 7 Days</option>
				<option>Last 90 Days</option>
				<option>This Year</option>
			</select>
		</div>

		<!-- Stats Cards -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-base-content/60">Total Reservations</p>
							<p class="mt-1 text-3xl font-bold">{stats.totalReservations}</p>
							<p class="mt-1 text-sm text-success">↑ 12% from last period</p>
						</div>
						<div class="rounded-lg bg-primary/10 p-3">
							<IconBox class="h-8 w-8 text-primary" />
						</div>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-base-content/60">Total Revenue</p>
							<p class="mt-1 text-3xl font-bold">€{stats.totalRevenue.toLocaleString()}</p>
							<p class="mt-1 text-sm text-success">↑ 8% from last period</p>
						</div>
						<div class="rounded-lg bg-success/10 p-3">
							<IconMoney class="h-8 w-8 text-success" />
						</div>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-base-content/60">Completion Rate</p>
							<p class="mt-1 text-3xl font-bold">{stats.completionRate}%</p>
							<p class="mt-1 text-sm text-success">↑ 3% from last period</p>
						</div>
						<div class="rounded-lg bg-info/10 p-3">
							<IconChartLine class="h-8 w-8 text-info" />
						</div>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-base-content/60">Favorites</p>
							<p class="mt-1 text-3xl font-bold">{stats.favoriteCount}</p>
							<p class="mt-1 text-sm text-success">↑ 15% from last period</p>
						</div>
						<div class="rounded-lg bg-warning/10 p-3">
							<IconStar class="h-8 w-8 text-warning" />
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Charts Row 1 -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Reservations Trend -->
			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h2 class="mb-4 card-title text-lg">Reservations Over Time</h2>
					<div class="h-64">
						<Chart
							data={reservationsData}
							x="date"
							xScale={scaleTime()}
							y="count"
							yScale={scaleLinear()}
							yDomain={[0, null]}
							padding={{ left: 16, bottom: 24, top: 8 }}
						>
							<Svg>
								<LinearGradient class="from-primary/50 to-primary/0" vertical let:url>
									<Area line={{ class: 'stroke-primary stroke-2' }} fill={url} />
								</LinearGradient>
								<AxisY
									gridlines
									rule={{ class: 'stroke-base-content/10' }}
									labelProps={{ class: 'text-xs fill-base-content/60' }}
								/>
								<AxisX
									formatTick={(d) => format(d, PeriodType.Day, { variant: 'short' })}
									labelProps={{ class: 'text-xs fill-base-content/60' }}
								/>
								<Highlight area />
							</Svg>
							<Tooltip header={(data) => format(data.date, PeriodType.Day)} let:data>
								<div class="tooltip-row">
									<span class="tooltip-label">Reservations:</span>
									<span class="tooltip-value">{data.count}</span>
								</div>
								<div class="tooltip-row">
									<span class="tooltip-label">Revenue:</span>
									<span class="tooltip-value">€{data.revenue}</span>
								</div>
							</Tooltip>
						</Chart>
					</div>
				</div>
			</div>

			<!-- Revenue Trend -->
			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h2 class="mb-4 card-title text-lg">Revenue Over Time</h2>
					<div class="h-64">
						<Chart
							data={reservationsData}
							x="date"
							xScale={scaleTime()}
							y="revenue"
							yScale={scaleLinear()}
							yDomain={[0, null]}
							padding={{ left: 16, bottom: 24, top: 8 }}
						>
							<Svg>
								<LinearGradient class="from-success/50 to-success/0" vertical let:url>
									<Area line={{ class: 'stroke-success stroke-2' }} fill={url} />
								</LinearGradient>
								<AxisY
									gridlines
									rule={{ class: 'stroke-base-content/10' }}
									labelProps={{ class: 'text-xs fill-base-content/60' }}
									format={(d) => `€${d}`}
								/>
								<AxisX
									formatTick={(d) => format(d, PeriodType.Day, { variant: 'short' })}
									labelProps={{ class: 'text-xs fill-base-content/60' }}
								/>
								<Highlight area />
							</Svg>
							<Tooltip header={(data) => format(data.date, PeriodType.Day)} let:data>
								<div class="tooltip-row">
									<span class="tooltip-label">Revenue:</span>
									<span class="tooltip-value">€{data.revenue}</span>
								</div>
							</Tooltip>
						</Chart>
					</div>
				</div>
			</div>
		</div>

		<!-- Charts Row 2 -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Peak Hours -->
			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h2 class="mb-4 card-title flex items-center gap-2 text-lg">
						<IconClock class="h-5 w-5" />
						Peak Pickup Hours
					</h2>
					<div class="h-64">
						<Chart
							data={peakHoursData}
							x="hour"
							y="pickups"
							yScale={scaleLinear()}
							yDomain={[0, null]}
							padding={{ left: 16, bottom: 24, top: 8, right: 8 }}
						>
							<Svg>
								<LinearGradient class="from-info/50 to-info/0" vertical let:url>
									<Area line={{ class: 'stroke-info stroke-2' }} fill={url} />
								</LinearGradient>
								<AxisY
									gridlines
									rule={{ class: 'stroke-base-content/10' }}
									labelProps={{ class: 'text-xs fill-base-content/60' }}
								/>
								<AxisX labelProps={{ class: 'text-xs fill-base-content/60' }} />
								<Highlight area />
							</Svg>
							<Tooltip let:data>
								<div class="tooltip-row">
									<span class="tooltip-label">Time:</span>
									<span class="tooltip-value">{data.hour}</span>
								</div>
								<div class="tooltip-row">
									<span class="tooltip-label">Pickups:</span>
									<span class="tooltip-value">{data.pickups}</span>
								</div>
							</Tooltip>
						</Chart>
					</div>
				</div>
			</div>

			<!-- Top Offers Performance -->
			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h2 class="mb-4 card-title text-lg">Top Performing Offers</h2>
					<div class="max-h-64 space-y-3 overflow-y-auto">
						{#each offerPerformanceData as offer, i}
							<div
								class="flex items-center gap-3 rounded-lg bg-base-200 p-3 transition-colors hover:bg-base-300"
							>
								<div class="badge badge-lg font-bold badge-primary">{i + 1}</div>
								<div class="min-w-0 flex-1">
									<p class="truncate font-semibold">{offer.name}</p>
									<div class="mt-1 flex items-center gap-4 text-sm text-base-content/60">
										<span class="flex items-center gap-1">
											<IconBox class="h-4 w-4" />
											{offer.reservations}
										</span>
										<span class="flex items-center gap-1">
											<IconMoney class="h-4 w-4" />
											€{offer.revenue}
										</span>
										<span class="flex items-center gap-1">
											<IconStar class="h-4 w-4 text-warning" />
											{offer.avgRating}
										</span>
									</div>
								</div>
								<div class="text-right">
									<div class="text-sm font-medium">€{offer.revenue}</div>
									<div class="text-xs text-base-content/60">revenue</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- Location Performance Table -->
		<div class="card bg-base-100 shadow-lg">
			<div class="card-body">
				<h2 class="mb-4 card-title flex items-center gap-2 text-lg">
					<IconPeople class="h-5 w-5" />
					Location Performance
				</h2>
				<div class="overflow-x-auto">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th>Location</th>
								<th>Reservations</th>
								<th>Revenue</th>
								<th>Completion Rate</th>
								<th>Favorites</th>
								<th>Avg Rating</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>
									<div class="font-semibold">Downtown Branch</div>
									<div class="text-sm text-base-content/60">123 Main St</div>
								</td>
								<td>342</td>
								<td class="font-semibold">€3,420</td>
								<td>
									<div class="flex items-center gap-2">
										<progress class="progress w-20 progress-success" value="89" max="100"
										></progress>
										<span class="text-sm">89%</span>
									</div>
								</td>
								<td>156</td>
								<td>
									<div class="flex items-center gap-1">
										<IconStar class="h-4 w-4 text-warning" />
										<span>4.5</span>
									</div>
								</td>
							</tr>
							<tr>
								<td>
									<div class="font-semibold">Westside Store</div>
									<div class="text-sm text-base-content/60">456 Oak Ave</div>
								</td>
								<td>287</td>
								<td class="font-semibold">€2,870</td>
								<td>
									<div class="flex items-center gap-2">
										<progress class="progress w-20 progress-success" value="85" max="100"
										></progress>
										<span class="text-sm">85%</span>
									</div>
								</td>
								<td>124</td>
								<td>
									<div class="flex items-center gap-1">
										<IconStar class="h-4 w-4 text-warning" />
										<span>4.3</span>
									</div>
								</td>
							</tr>
							<tr>
								<td>
									<div class="font-semibold">East Market</div>
									<div class="text-sm text-base-content/60">789 Elm Rd</div>
								</td>
								<td>198</td>
								<td class="font-semibold">€1,980</td>
								<td>
									<div class="flex items-center gap-2">
										<progress class="progress w-20 progress-warning" value="78" max="100"
										></progress>
										<span class="text-sm">78%</span>
									</div>
								</td>
								<td>87</td>
								<td>
									<div class="flex items-center gap-1">
										<IconStar class="h-4 w-4 text-warning" />
										<span>4.1</span>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	:global(.tooltip-row) {
		@apply flex justify-between gap-4 text-sm;
	}

	:global(.tooltip-label) {
		@apply text-base-content/60;
	}

	:global(.tooltip-value) {
		@apply font-semibold;
	}
</style>
