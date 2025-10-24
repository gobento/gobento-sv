<!-- /src/routes/(dock)/analytics/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { Chart, Svg, Tooltip, Area, LinearGradient, Axis, Highlight } from 'layerchart';
	import { scaleTime, scaleLinear } from 'd3-scale';
	import { timeFormat } from 'd3-time-format';
	import FluentChartMultiple24Regular from '~icons/fluent/chart-multiple-24-regular';
	import IconMoney from '~icons/fluent/money-20-filled';
	import IconBox from '~icons/fluent/box-20-filled';
	import IconPeople from '~icons/fluent/people-20-filled';
	import IconStar from '~icons/fluent/star-20-filled';
	import IconClock from '~icons/fluent/clock-20-filled';

	let { data }: { data: PageData } = $props();

	// Transform reservations data to use Date objects
	const reservationsData = $derived(
		data.reservationsData.map((row) => ({
			date: new Date(row.date),
			count: row.count,
			revenue: row.revenue
		}))
	);
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
							<p class="mt-1 text-3xl font-bold">{data.stats.totalReservations}</p>
							<p class="mt-1 text-sm text-base-content/60">
								Avg: {data.stats.avgPerDay} per day
							</p>
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
							<p class="mt-1 text-3xl font-bold">
								€{data.stats.totalRevenue.toLocaleString('de-DE', {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2
								})}
							</p>
							<p class="mt-1 text-sm text-base-content/60">Last 30 days</p>
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
							<p class="mt-1 text-3xl font-bold">{data.stats.completionRate}%</p>
							<p class="mt-1 text-sm text-base-content/60">
								{data.stats.activeOffers} active offers
							</p>
						</div>
						<div class="rounded-lg bg-info/10 p-3">
							<FluentChartMultiple24Regular class="h-8 w-8 text-info" />
						</div>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-base-content/60">Favorites</p>
							<p class="mt-1 text-3xl font-bold">{data.stats.favoriteCount}</p>
							<p class="mt-1 text-sm text-base-content/60">Total users</p>
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
					{#if reservationsData.length > 0}
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
								<Tooltip header={(data) => timeFormat('%B %d, %Y')(data.date)} let:data>
									<div class="tooltip-row">
										<span class="tooltip-label">Reservations:</span>
										<span class="tooltip-value">{data.count}</span>
									</div>
									<div class="tooltip-row">
										<span class="tooltip-label">Revenue:</span>
										<span class="tooltip-value">€{data.revenue.toFixed(2)}</span>
									</div>
								</Tooltip>
							</Chart>
						</div>
					{:else}
						<div class="flex h-64 items-center justify-center text-base-content/60">
							No reservation data available for the last 30 days
						</div>
					{/if}
				</div>
			</div>

			<!-- Revenue Trend -->
			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h2 class="mb-4 card-title text-lg">Revenue Over Time</h2>
					{#if reservationsData.length > 0}
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
								<Tooltip header={(data) => timeFormat('%B %d, %Y')(data.date)} let:data>
									<div class="tooltip-row">
										<span class="tooltip-label">Revenue:</span>
										<span class="tooltip-value">€{data.revenue.toFixed(2)}</span>
									</div>
								</Tooltip>
							</Chart>
						</div>
					{:else}
						<div class="flex h-64 items-center justify-center text-base-content/60">
							No revenue data available for the last 30 days
						</div>
					{/if}
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
					{#if data.peakHoursData.length > 0}
						<div class="h-64">
							<Chart
								data={data.peakHoursData}
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
									<Axis
										placement="left"
										grid
										rule
										labelProps={{ class: 'text-xs fill-base-content/60' }}
									/>
									<Axis placement="bottom" labelProps={{ class: 'text-xs fill-base-content/60' }} />
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
					{:else}
						<div class="flex h-64 items-center justify-center text-base-content/60">
							No pickup data available
						</div>
					{/if}
				</div>
			</div>

			<!-- Top Offers Performance -->
			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h2 class="mb-4 card-title text-lg">Top Performing Offers</h2>
					{#if data.offerPerformanceData.length > 0}
						<div class="max-h-64 space-y-3 overflow-y-auto">
							{#each data.offerPerformanceData as offer, i}
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
												€{offer.revenue.toFixed(0)}
											</span>
											<span class="flex items-center gap-1">
												<IconStar class="h-4 w-4 text-warning" />
												{offer.avgRating}
											</span>
										</div>
									</div>
									<div class="text-right">
										<div class="text-sm font-medium">€{offer.revenue.toFixed(0)}</div>
										<div class="text-xs text-base-content/60">revenue</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex h-64 items-center justify-center text-base-content/60">
							No active offers found
						</div>
					{/if}
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
				{#if data.locationPerformanceData.length > 0}
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
								{#each data.locationPerformanceData as location}
									<tr>
										<td>
											<div class="font-semibold">{location.name}</div>
											<div class="text-sm text-base-content/60">
												{location.address}, {location.city}
											</div>
										</td>
										<td>{location.totalReservations}</td>
										<td class="font-semibold">
											€{location.revenue.toLocaleString('de-DE', {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2
											})}
										</td>
										<td>
											<div class="flex items-center gap-2">
												<progress
													class="progress w-20"
													class:progress-success={location.completionRate >= 80}
													class:progress-warning={location.completionRate >= 60 &&
														location.completionRate < 80}
													class:progress-error={location.completionRate < 60}
													value={location.completionRate}
													max="100"
												></progress>
												<span class="text-sm">{location.completionRate}%</span>
											</div>
										</td>
										<td>{location.favoritesCount}</td>
										<td>
											<div class="flex items-center gap-1">
												<IconStar class="h-4 w-4 text-warning" />
												<span>{location.avgRating}</span>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="flex h-32 items-center justify-center text-base-content/60">
						No location data available
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
