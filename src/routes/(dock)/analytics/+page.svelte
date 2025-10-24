<!-- /src/routes/(dock)/analytics/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { Chart, Svg, Area, Axis, Highlight, Tooltip } from 'layerchart';
	import { scaleTime, scaleLinear } from 'd3-scale';
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

	// Format date for axis labels (short version)
	const formatDateShort = (date: Date) => {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	};

	// Format date for tooltip header
	const formatDateLong = (date: Date) => {
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'long',
			day: 'numeric'
		});
	};
</script>

<!-- Header -->
<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Analytics</h1>
		<p class="mt-1 text-sm text-base-content/60">Track performance and insights</p>
	</div>
	<select class="select-bordered select bg-base-200 select-sm font-medium">
		<option>Last 30 Days</option>
		<option>Last 7 Days</option>
		<option>Last 90 Days</option>
		<option>This Year</option>
	</select>
</div>

<!-- Stats Cards -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
	<div class="rounded-lg border border-base-300 bg-base-200 p-5">
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<div class="flex items-center gap-2">
					<IconBox class="size-4 text-primary" />
					<p class="text-xs font-medium tracking-wide text-base-content/60 uppercase">
						Reservations
					</p>
				</div>
				<p class="mt-3 text-3xl font-semibold tabular-nums">{data.stats.totalReservations}</p>
				<p class="mt-1 text-sm text-base-content/50">
					{data.stats.avgPerDay} per day
				</p>
			</div>
		</div>
	</div>

	<div class="rounded-lg border border-base-300 bg-base-200 p-5">
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<div class="flex items-center gap-2">
					<IconMoney class="size-4 text-success" />
					<p class="text-xs font-medium tracking-wide text-base-content/60 uppercase">Revenue</p>
				</div>
				<p class="mt-3 text-3xl font-semibold tabular-nums">
					€{data.stats.totalRevenue.toLocaleString('de-DE', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					})}
				</p>
				<p class="mt-1 text-sm text-base-content/50">Last 30 days</p>
			</div>
		</div>
	</div>

	<div class="rounded-lg border border-base-300 bg-base-200 p-5">
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<div class="flex items-center gap-2">
					<FluentChartMultiple24Regular class="size-4 text-info" />
					<p class="text-xs font-medium tracking-wide text-base-content/60 uppercase">Completion</p>
				</div>
				<p class="mt-3 text-3xl font-semibold tabular-nums">{data.stats.completionRate}%</p>
				<p class="mt-1 text-sm text-base-content/50">
					{data.stats.activeOffers} active offers
				</p>
			</div>
		</div>
	</div>

	<div class="rounded-lg border border-base-300 bg-base-200 p-5">
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<div class="flex items-center gap-2">
					<IconStar class="size-4 text-warning" />
					<p class="text-xs font-medium tracking-wide text-base-content/60 uppercase">Favorites</p>
				</div>
				<p class="mt-3 text-3xl font-semibold tabular-nums">{data.stats.favoriteCount}</p>
				<p class="mt-1 text-sm text-base-content/50">Total users</p>
			</div>
		</div>
	</div>
</div>

<!-- Charts Row 1 -->
<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
	<!-- Reservations Trend -->
	<div class="rounded-lg border border-base-300 bg-base-200 p-6">
		<h2 class="mb-6 text-base font-semibold">Reservations Over Time</h2>
		{#if reservationsData.length > 0}
			<div class="h-64">
				<Chart
					data={reservationsData}
					x="date"
					xScale={scaleTime()}
					y="count"
					yScale={scaleLinear()}
					yDomain={[0, null]}
					yNice
					padding={{ left: 16, bottom: 24, top: 8 }}
					tooltip={{ mode: 'bisect-x' }}
				>
					<Svg>
						<Area line={{ class: 'stroke-primary stroke-2' }} fill="transparent" />
						<Axis
							placement="left"
							grid
							rule={{ class: 'stroke-base-content/10' }}
							labelProps={{ class: 'text-xs fill-base-content/60' }}
						/>
						<Axis
							placement="bottom"
							format={formatDateShort}
							rule={{ class: 'stroke-base-content/10' }}
							labelProps={{ class: 'text-xs fill-base-content/60' }}
						/>
						<Highlight points lines />
					</Svg>
					<Tooltip.Root let:data>
						<Tooltip.Header>{formatDateLong(data.date)}</Tooltip.Header>
						<Tooltip.List>
							<Tooltip.Item label="Reservations" value={data.count} />
							<Tooltip.Item label="Revenue" value={`€${data.revenue.toFixed(2)}`} />
						</Tooltip.List>
					</Tooltip.Root>
				</Chart>
			</div>
		{:else}
			<div class="flex h-64 items-center justify-center text-sm text-base-content/50">
				No reservation data available
			</div>
		{/if}
	</div>

	<!-- Revenue Trend -->
	<div class="rounded-lg border border-base-300 bg-base-200 p-6">
		<h2 class="mb-6 text-base font-semibold">Revenue Over Time</h2>
		{#if reservationsData.length > 0}
			<div class="h-64">
				<Chart
					data={reservationsData}
					x="date"
					xScale={scaleTime()}
					y="revenue"
					yScale={scaleLinear()}
					yDomain={[0, null]}
					yNice
					padding={{ left: 16, bottom: 24, top: 8 }}
					tooltip={{ mode: 'bisect-x' }}
				>
					<Svg>
						<Area line={{ class: 'stroke-success stroke-2' }} fill="transparent" />
						<Axis
							placement="left"
							grid
							rule={{ class: 'stroke-base-content/10' }}
							labelProps={{ class: 'text-xs fill-base-content/60' }}
							format={(d) => `€${d}`}
						/>
						<Axis
							placement="bottom"
							format={formatDateShort}
							rule={{ class: 'stroke-base-content/10' }}
							labelProps={{ class: 'text-xs fill-base-content/60' }}
						/>
						<Highlight points lines />
					</Svg>
					<Tooltip.Root let:data>
						<Tooltip.Header>{formatDateLong(data.date)}</Tooltip.Header>
						<Tooltip.List>
							<Tooltip.Item label="Revenue" value={`€${data.revenue.toFixed(2)}`} />
						</Tooltip.List>
					</Tooltip.Root>
				</Chart>
			</div>
		{:else}
			<div class="flex h-64 items-center justify-center text-sm text-base-content/50">
				No revenue data available
			</div>
		{/if}
	</div>
</div>

<!-- Charts Row 2 -->
<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
	<!-- Peak Hours -->
	<div class="rounded-lg border border-base-300 bg-base-200 p-6">
		<h2 class="mb-6 flex items-center gap-2 text-base font-semibold">
			<IconClock class="size-4" />
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
					yNice
					padding={{ left: 16, bottom: 24, top: 8, right: 8 }}
					tooltip={{ mode: 'bisect-x' }}
				>
					<Svg>
						<Area line={{ class: 'stroke-info stroke-2' }} fill="transparent" />
						<Axis
							placement="left"
							grid
							rule={{ class: 'stroke-base-content/10' }}
							labelProps={{ class: 'text-xs fill-base-content/60' }}
						/>
						<Axis
							placement="bottom"
							rule={{ class: 'stroke-base-content/10' }}
							labelProps={{ class: 'text-xs fill-base-content/60' }}
						/>
						<Highlight points lines />
					</Svg>
					<Tooltip.Root let:data>
						<Tooltip.Header>{data.hour}</Tooltip.Header>
						<Tooltip.List>
							<Tooltip.Item label="Pickups" value={data.pickups} />
						</Tooltip.List>
					</Tooltip.Root>
				</Chart>
			</div>
		{:else}
			<div class="flex h-64 items-center justify-center text-sm text-base-content/50">
				No pickup data available
			</div>
		{/if}
	</div>

	<!-- Top Offers Performance -->
	<div class="rounded-lg border border-base-300 bg-base-200 p-6">
		<h2 class="mb-6 text-base font-semibold">Top Performing Offers</h2>
		{#if data.offerPerformanceData.length > 0}
			<div class="max-h-64 space-y-2 overflow-y-auto">
				{#each data.offerPerformanceData as offer, i}
					<div class="flex items-center gap-3 rounded border border-base-300 bg-base-100 p-3">
						<div
							class="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
						>
							{i + 1}
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">{offer.name}</p>
							<div class="mt-1 flex items-center gap-3 text-xs text-base-content/60">
								<span class="flex items-center gap-1">
									<IconBox class="h-3.5 w-3.5" />
									{offer.reservations}
								</span>
								<span class="flex items-center gap-1">
									<IconStar class="h-3.5 w-3.5 text-warning" />
									{offer.avgRating}
								</span>
							</div>
						</div>
						<div class="text-right">
							<div class="text-sm font-semibold tabular-nums">
								€{offer.revenue.toFixed(0)}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="flex h-64 items-center justify-center text-sm text-base-content/50">
				No active offers found
			</div>
		{/if}
	</div>
</div>

<!-- Location Performance Table -->
<div class="rounded-lg border border-base-300 bg-base-200 p-6">
	<h2 class="mb-6 flex items-center gap-2 text-base font-semibold">
		<IconPeople class="size-4" />
		Location Performance
	</h2>
	{#if data.locationPerformanceData.length > 0}
		<div class="overflow-x-auto">
			<table class="table table-sm">
				<thead>
					<tr class="border-base-300">
						<th class="text-xs font-medium tracking-wide text-base-content/60 uppercase">
							Location
						</th>
						<th class="text-xs font-medium tracking-wide text-base-content/60 uppercase">
							Reservations
						</th>
						<th class="text-xs font-medium tracking-wide text-base-content/60 uppercase">
							Revenue
						</th>
						<th class="text-xs font-medium tracking-wide text-base-content/60 uppercase">
							Completion
						</th>
						<th class="text-xs font-medium tracking-wide text-base-content/60 uppercase">
							Favorites
						</th>
						<th class="text-xs font-medium tracking-wide text-base-content/60 uppercase">
							Rating
						</th>
					</tr>
				</thead>
				<tbody>
					{#each data.locationPerformanceData as location}
						<tr class="border-base-300">
							<td>
								<div class="font-medium">{location.name}</div>
								<div class="text-xs text-base-content/50">
									{location.address}, {location.city}
								</div>
							</td>
							<td class="tabular-nums">{location.totalReservations}</td>
							<td class="font-medium tabular-nums">
								€{location.revenue.toLocaleString('de-DE', {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2
								})}
							</td>
							<td>
								<div class="flex items-center gap-2">
									<progress
										class="progress-xs progress w-16"
										class:progress-success={location.completionRate >= 80}
										class:progress-warning={location.completionRate >= 60 &&
											location.completionRate < 80}
										class:progress-error={location.completionRate < 60}
										value={location.completionRate}
										max="100"
									></progress>
									<span class="text-xs tabular-nums">{location.completionRate}%</span>
								</div>
							</td>
							<td class="tabular-nums">{location.favoritesCount}</td>
							<td>
								<div class="flex items-center gap-1">
									<IconStar class="h-3.5 w-3.5 text-warning" />
									<span class="tabular-nums">{location.avgRating}</span>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="flex h-32 items-center justify-center text-sm text-base-content/50">
			No location data available
		</div>
	{/if}
</div>
