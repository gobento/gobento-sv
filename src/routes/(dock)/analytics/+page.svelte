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
	import ChartFilledIcon from '~icons/fluent/data-bar-vertical-24-filled';

	import BaseLayout from '$lib/components/BaseLayout.svelte';

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

	// Handle offer click
	const handleOfferClick = (offerId: string) => {
		window.location.href = `/offers/${offerId}`;
	};

	// Handle location click
	const handleLocationClick = (locationId: string) => {
		window.location.href = `/locations/${locationId}`;
	};
</script>

<BaseLayout title="Analytics" description="Track performance and insights" icon={ChartFilledIcon}>
	<select class="select-bordered select w-full bg-base-200 select-sm font-medium sm:w-auto">
		<option>Last 30 Days</option>
		<option>Last 7 Days</option>
		<option>Last 90 Days</option>
		<option>This Year</option>
	</select>

	<!-- Stats Cards -->
	<div class="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-4">
		<div class="rounded-lg border border-base-300 bg-base-200 p-3 sm:p-4">
			<div class="flex items-center gap-1.5 sm:gap-2">
				<div class="size-3.5 shrink-0 text-primary sm:size-4">
					<IconBox class="size-full" />
				</div>
				<p class="text-sm font-medium tracking-wide text-base-content/60 uppercase sm:text-xs">
					Reservations
				</p>
			</div>
			<p class="mt-2 text-xl font-semibold tabular-nums sm:mt-3 sm:text-2xl lg:text-lg">
				{data.stats.totalReservations}
			</p>
			<p class="mt-0.5 text-[11px] text-base-content/50 sm:mt-1 sm:text-xs">
				{data.stats.avgPerDay} per day
			</p>
		</div>

		<div class="rounded-lg border border-base-300 bg-base-200 p-3 sm:p-4">
			<div class="flex items-center gap-1.5 sm:gap-2">
				<div class="size-3.5 shrink-0 text-success sm:size-4">
					<IconMoney class="size-full" />
				</div>
				<p class="text-sm font-medium tracking-wide text-base-content/60 uppercase sm:text-xs">
					Revenue
				</p>
			</div>
			<p class="mt-2 text-xl font-semibold tabular-nums sm:mt-3 sm:text-2xl lg:text-lg">
				€{data.stats.totalRevenue.toLocaleString('de-DE', {
					minimumFractionDigits: 0,
					maximumFractionDigits: 0
				})}
			</p>
			<p class="mt-0.5 text-[11px] text-base-content/50 sm:mt-1 sm:text-xs">Last 30 days</p>
		</div>

		<div class="rounded-lg border border-base-300 bg-base-200 p-3 sm:p-4">
			<div class="flex items-center gap-1.5 sm:gap-2">
				<div class="size-3.5 shrink-0 text-info sm:size-4">
					<FluentChartMultiple24Regular class="size-full" />
				</div>
				<p class="text-sm font-medium tracking-wide text-base-content/60 uppercase sm:text-xs">
					Completion
				</p>
			</div>
			<p class="mt-2 text-xl font-semibold tabular-nums sm:mt-3 sm:text-2xl lg:text-lg">
				{data.stats.completionRate}%
			</p>
			<p class="mt-0.5 text-[11px] text-base-content/50 sm:mt-1 sm:text-xs">
				{data.stats.activeOffers} active
			</p>
		</div>

		<div class="rounded-lg border border-base-300 bg-base-200 p-3 sm:p-4">
			<div class="flex items-center gap-1.5 sm:gap-2">
				<div class="size-3.5 shrink-0 text-warning sm:size-4">
					<IconStar class="size-full" />
				</div>
				<p class="text-sm font-medium tracking-wide text-base-content/60 uppercase sm:text-xs">
					Favorites
				</p>
			</div>
			<p class="mt-2 text-xl font-semibold tabular-nums sm:mt-3 sm:text-2xl lg:text-lg">
				{data.stats.favoriteCount}
			</p>
			<p class="mt-0.5 text-[11px] text-base-content/50 sm:mt-1 sm:text-xs">Total users</p>
		</div>
	</div>

	<!-- Charts Row 1 -->
	<div class="mb-4 grid grid-cols-1 gap-4 sm:mb-6 lg:grid-cols-2">
		<!-- Reservations Trend -->
		<div class="rounded-lg border border-base-300 bg-base-200 p-4 sm:p-5">
			<h2 class="mb-4 text-sm font-semibold sm:mb-5 sm:text-base">Reservations Over Time</h2>
			{#if reservationsData.length > 0}
				<div class="h-48 sm:h-56 lg:h-64">
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
								labelProps={{ class: 'text-sm sm:text-xs fill-base-content/60' }}
							/>
							<Axis
								placement="bottom"
								format={formatDateShort}
								rule={{ class: 'stroke-base-content/10' }}
								labelProps={{ class: 'text-sm sm:text-xs fill-base-content/60' }}
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
				<div
					class="flex h-48 items-center justify-center text-xs text-base-content/50 sm:h-56 sm:text-sm lg:h-64"
				>
					No reservation data available
				</div>
			{/if}
		</div>

		<!-- Revenue Trend -->
		<div class="rounded-lg border border-base-300 bg-base-200 p-4 sm:p-5">
			<h2 class="mb-4 text-sm font-semibold sm:mb-5 sm:text-base">Revenue Over Time</h2>
			{#if reservationsData.length > 0}
				<div class="h-48 sm:h-56 lg:h-64">
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
								labelProps={{ class: 'text-sm sm:text-xs fill-base-content/60' }}
								format={(d) => `€${d}`}
							/>
							<Axis
								placement="bottom"
								format={formatDateShort}
								rule={{ class: 'stroke-base-content/10' }}
								labelProps={{ class: 'text-sm sm:text-xs fill-base-content/60' }}
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
				<div
					class="flex h-48 items-center justify-center text-xs text-base-content/50 sm:h-56 sm:text-sm lg:h-64"
				>
					No revenue data available
				</div>
			{/if}
		</div>
	</div>

	<!-- Charts Row 2 -->
	<div class="mb-4 grid grid-cols-1 gap-4 sm:mb-6 lg:grid-cols-2">
		<!-- Peak Hours -->
		<div class="rounded-lg border border-base-300 bg-base-200 p-4 sm:p-5">
			<h2 class="mb-4 flex items-center gap-2 text-sm font-semibold sm:mb-5 sm:text-base">
				<div class="size-3.5 sm:size-4">
					<IconClock class="size-full" />
				</div>
				Peak Pickup Hours
			</h2>
			{#if data.peakHoursData.length > 0}
				<div class="h-48 sm:h-56 lg:h-64">
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
								labelProps={{ class: 'text-sm sm:text-xs fill-base-content/60' }}
							/>
							<Axis
								placement="bottom"
								rule={{ class: 'stroke-base-content/10' }}
								labelProps={{ class: 'text-sm sm:text-xs fill-base-content/60' }}
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
				<div
					class="flex h-48 items-center justify-center text-xs text-base-content/50 sm:h-56 sm:text-sm lg:h-64"
				>
					No pickup data available
				</div>
			{/if}
		</div>

		<!-- Top Offers Performance -->
		<div class="rounded-lg border border-base-300 bg-base-200 p-4 sm:p-5">
			<h2 class="mb-4 text-sm font-semibold sm:mb-5 sm:text-base">Top Performing Offers</h2>
			{#if data.offerPerformanceData.length > 0}
				<div class="max-h-48 space-y-2 overflow-y-auto sm:max-h-56 lg:max-h-64">
					{#each data.offerPerformanceData as offer, i}
						<button
							type="button"
							onclick={() => handleOfferClick(offer.id)}
							class="flex w-full items-center gap-2.5 rounded border border-base-300 bg-base-100 p-2.5 text-left transition-colors hover:border-primary hover:bg-base-100/50 sm:gap-3 sm:p-3"
						>
							<div
								class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary sm:size-6 sm:text-xs"
							>
								{i + 1}
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate text-xs font-medium sm:text-sm">{offer.name}</p>
								<div
									class="mt-0.5 flex items-center gap-2.5 text-sm text-base-content/60 sm:mt-1 sm:gap-3 sm:text-xs"
								>
									<span class="flex items-center gap-0.5 sm:gap-1">
										<div class="h-3 w-3 sm:h-3.5 sm:w-3.5">
											<IconBox class="size-full" />
										</div>
										{offer.reservations}
									</span>
									<span class="flex items-center gap-0.5 sm:gap-1">
										<div class="h-3 w-3 text-warning sm:h-3.5 sm:w-3.5">
											<IconStar class="size-full" />
										</div>
										{offer.avgRating}
									</span>
								</div>
							</div>
							<div class="text-right">
								<div class="text-xs font-semibold tabular-nums sm:text-sm">
									€{offer.revenue.toFixed(0)}
								</div>
							</div>
						</button>
					{/each}
				</div>
			{:else}
				<div
					class="flex h-48 items-center justify-center text-xs text-base-content/50 sm:h-56 sm:text-sm lg:h-64"
				>
					No active offers found
				</div>
			{/if}
		</div>
	</div>

	<!-- Location Performance Table -->
	<div class="rounded-lg border border-base-300 bg-base-200 p-4 sm:p-5">
		<h2 class="mb-4 flex items-center gap-2 text-sm font-semibold sm:mb-5 sm:text-base">
			<div class="size-3.5 sm:size-4">
				<IconPeople class="size-full" />
			</div>
			Location Performance
		</h2>
		{#if data.locationPerformanceData.length > 0}
			<div class="-mx-4 overflow-x-auto sm:mx-0">
				<div class="inline-block min-w-full align-middle">
					<table class="table w-full table-sm">
						<thead>
							<tr class="border-base-300">
								<th
									class="text-sm font-medium tracking-wide text-base-content/60 uppercase sm:text-xs"
								>
									Location
								</th>
								<th
									class="text-sm font-medium tracking-wide text-base-content/60 uppercase sm:text-xs"
								>
									Reservations
								</th>
								<th
									class="text-sm font-medium tracking-wide text-base-content/60 uppercase sm:text-xs"
								>
									Revenue
								</th>
								<th
									class="hidden text-sm font-medium tracking-wide text-base-content/60 uppercase sm:table-cell sm:text-xs"
								>
									Completion
								</th>
								<th
									class="hidden text-sm font-medium tracking-wide text-base-content/60 uppercase sm:table-cell sm:text-xs"
								>
									Favorites
								</th>
								<th
									class="text-sm font-medium tracking-wide text-base-content/60 uppercase sm:text-xs"
								>
									Rating
								</th>
							</tr>
						</thead>
						<tbody>
							{#each data.locationPerformanceData as location}
								<tr
									class="cursor-pointer border-base-300 transition-colors hover:bg-base-300/50"
									onclick={() => handleLocationClick(location.id)}
								>
									<td class="min-w-[120px] sm:min-w-0">
										<div class="text-xs font-medium sm:text-sm">{location.name}</div>
										<div class="text-sm text-base-content/50 sm:text-xs">
											{location.address}, {location.city}
										</div>
									</td>
									<td class="text-xs tabular-nums sm:text-sm">{location.totalReservations}</td>
									<td class="text-xs font-medium tabular-nums sm:text-sm">
										€{location.revenue.toLocaleString('de-DE', {
											minimumFractionDigits: 0,
											maximumFractionDigits: 0
										})}
									</td>
									<td class="hidden sm:table-cell">
										<div class="flex items-center gap-2">
											<progress
												class="progress-xs progress w-12 sm:w-16"
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
									<td class="hidden text-xs tabular-nums sm:table-cell sm:text-sm">
										{location.favoritesCount}
									</td>
									<td>
										<div class="flex items-center gap-0.5 sm:gap-1">
											<div class="h-3 w-3 text-warning sm:h-3.5 sm:w-3.5">
												<IconStar class="size-full" />
											</div>
											<span class="text-xs tabular-nums sm:text-sm">{location.avgRating}</span>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else}
			<div class="flex h-32 items-center justify-center text-xs text-base-content/50 sm:text-sm">
				No location data available
			</div>
		{/if}
	</div>
</BaseLayout>
