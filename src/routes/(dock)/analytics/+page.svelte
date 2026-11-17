<!-- /src/routes/(dock)/analytics/+page.svelte -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { withSearch } from '#lib/paths.js';
	import {
		ANALYTICS_RANGES,
		parseAnalyticsDays,
		rangeLabel,
		type AnalyticsDays
	} from '#lib/analytics.js';
	import { formatDate, formatDayMonth } from '#lib/dates.js';
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { Chart, Svg, Area, Axis, Highlight, Tooltip } from 'layerchart';
	import { scaleTime, scaleLinear } from 'd3-scale';
	import IconDownload from '~icons/fluent/arrow-download-24-regular';
	import IconBox from '~icons/fluent/box-24-regular';
	import IconMoney from '~icons/fluent/money-24-regular';
	import IconStar from '~icons/fluent/star-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import ChartIcon from '~icons/fluent/data-bar-vertical-24-regular';

	import BaseLayout from '#lib/components/layout/BaseLayout.svelte';
	import StatTile from '#lib/components/ui/StatTile.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Segmented from '#lib/components/ui/Segmented.svelte';

	let { data }: { data: PageData } = $props();

	const reservationsData = $derived(
		data.reservationsData.map((row) => ({
			date: new Date(row.date),
			count: row.count,
			revenue: row.revenue
		}))
	);

	type RangeOption = '7' | '30' | '90';
	const rangeOptions = ANALYTICS_RANGES.map((days) => ({
		value: String(days) as RangeOption,
		label: `${days}d`
	}));
	function changeRange(value: RangeOption) {
		const days: AnalyticsDays = parseAnalyticsDays(value);
		const params = new SvelteURLSearchParams();
		params.set('days', String(days));
		goto(withSearch(resolve('/(dock)/analytics'), params), { replace: true, reset: false });
	}

	const euro = (value: number, decimals = 0) =>
		value.toLocaleString('de-DE', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		});

	let exporting = $state(false);

	// Trigger a browser download from the base64 workbook returned by the export action.
	function downloadXlsx(base64: string, filename: string) {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		const url = URL.createObjectURL(
			new Blob([bytes], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			})
		);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	}
</script>

<BaseLayout
	title="Analytics"
	description="How your offers are doing, over the period you choose"
	icon={ChartIcon}
>
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<Segmented
			options={rangeOptions}
			value={String(data.days) as RangeOption}
			label="Reporting period"
			onchange={changeRange}
			class="sm:w-64"
		/>
		<form
			method="POST"
			action="?/export"
			use:enhance={() => {
				exporting = true;
				return async ({ result }) => {
					exporting = false;
					if (
						result.type === 'success' &&
						typeof result.data?.xlsx === 'string' &&
						typeof result.data?.filename === 'string'
					) {
						downloadXlsx(result.data.xlsx, result.data.filename);
					}
				};
			}}
		>
			<input type="hidden" name="days" value={data.days} />
			<button class="btn gap-2 btn-outline btn-sm" disabled={exporting}>
				{#if exporting}
					<span class="loading loading-xs loading-spinner"></span>
				{:else}
					<IconDownload class="size-4" />
				{/if}
				Export Excel
			</button>
		</form>
	</div>

	<div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
		<StatTile
			index={0}
			label="Reservations"
			value={data.stats.totalReservations}
			icon={IconBox}
			hint="{data.stats.avgPerDay.toFixed(1)} per day"
		/>
		<StatTile
			index={1}
			label="Revenue"
			value={data.stats.totalRevenue}
			decimals={2}
			prefix="€"
			icon={IconMoney}
			tone="success"
			hint={rangeLabel(data.days).toLowerCase()}
		/>
		<StatTile
			index={2}
			label="Completion"
			value={data.stats.completionRate}
			suffix="%"
			icon={IconStar}
			tone="warning"
			hint="{data.stats.activeOffers} active offers"
		/>
		<StatTile
			index={3}
			label="Favorites"
			value={data.stats.favoriteCount}
			icon={IconClock}
			tone="info"
			hint="people following your locations"
		/>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<Card class="animate-soft-pop stagger" style="--i: {0}">
			<h2 class="mb-4 text-base font-semibold">Reservations over time</h2>
			{#if reservationsData.length > 0}
				<div class="h-56 sm:h-64">
					<Chart
						data={reservationsData}
						x="date"
						xScale={scaleTime()}
						y="count"
						yScale={scaleLinear()}
						yDomain={[0, null]}
						yNice
						padding={{ left: 16, bottom: 24, top: 8 }}
						tooltipContext={{ mode: 'bisect-x' }}
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
								format={formatDayMonth}
								rule={{ class: 'stroke-base-content/10' }}
								labelProps={{ class: 'text-xs fill-base-content/60' }}
							/>
							<Highlight points lines />
						</Svg>
						<Tooltip.Root>
							{#snippet children({ data: point })}
								<Tooltip.Header>{formatDate(point.date)}</Tooltip.Header>
								<Tooltip.List>
									<Tooltip.Item label="Reservations" value={point.count} />
									<Tooltip.Item label="Revenue" value={`€${euro(point.revenue, 2)}`} />
								</Tooltip.List>
							{/snippet}
						</Tooltip.Root>
					</Chart>
				</div>
			{:else}
				<p class="py-16 text-center text-sm text-base-content/50">
					No reservations in the last {data.days} days yet.
				</p>
			{/if}
		</Card>

		<Card class="animate-soft-pop stagger" style="--i: {1}">
			<h2 class="mb-4 text-base font-semibold">Revenue over time</h2>
			{#if reservationsData.length > 0}
				<div class="h-56 sm:h-64">
					<Chart
						data={reservationsData}
						x="date"
						xScale={scaleTime()}
						y="revenue"
						yScale={scaleLinear()}
						yDomain={[0, null]}
						yNice
						padding={{ left: 16, bottom: 24, top: 8 }}
						tooltipContext={{ mode: 'bisect-x' }}
					>
						<Svg>
							<Area line={{ class: 'stroke-success stroke-2' }} fill="transparent" />
							<Axis
								placement="left"
								grid
								rule={{ class: 'stroke-base-content/10' }}
								labelProps={{ class: 'text-xs fill-base-content/60' }}
								format={(value: number) => `€${euro(value)}`}
							/>
							<Axis
								placement="bottom"
								format={formatDayMonth}
								rule={{ class: 'stroke-base-content/10' }}
								labelProps={{ class: 'text-xs fill-base-content/60' }}
							/>
							<Highlight points lines />
						</Svg>
						<Tooltip.Root>
							{#snippet children({ data: point })}
								<Tooltip.Header>{formatDate(point.date)}</Tooltip.Header>
								<Tooltip.List>
									<Tooltip.Item label="Revenue" value={`€${euro(point.revenue, 2)}`} />
								</Tooltip.List>
							{/snippet}
						</Tooltip.Root>
					</Chart>
				</div>
			{:else}
				<p class="py-16 text-center text-sm text-base-content/50">
					No revenue in the last {data.days} days yet.
				</p>
			{/if}
		</Card>

		<Card class="animate-soft-pop stagger" style="--i: {2}">
			<h2 class="mb-4 flex items-center gap-2 text-base font-semibold">
				<IconClock class="size-4 text-info" />
				Peak pickup hours
			</h2>
			{#if data.peakHoursData.length > 0}
				<div class="h-56 sm:h-64">
					<Chart
						data={data.peakHoursData}
						x="hour"
						y="pickups"
						yScale={scaleLinear()}
						yDomain={[0, null]}
						yNice
						padding={{ left: 16, bottom: 24, top: 8, right: 8 }}
						tooltipContext={{ mode: 'bisect-x' }}
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
						<Tooltip.Root>
							{#snippet children({ data: point })}
								<Tooltip.Header>{point.hour}</Tooltip.Header>
								<Tooltip.List>
									<Tooltip.Item label="Pickups" value={point.pickups} />
								</Tooltip.List>
							{/snippet}
						</Tooltip.Root>
					</Chart>
				</div>
			{:else}
				<p class="py-16 text-center text-sm text-base-content/50">No pickups in this period.</p>
			{/if}
		</Card>

		<Card class="animate-soft-pop stagger" style="--i: {3}">
			<h2 class="mb-4 text-base font-semibold">Top performing offers</h2>
			{#if data.offerPerformanceData.length > 0}
				<ul class="max-h-64 space-y-2 overflow-y-auto">
					{#each data.offerPerformanceData as offer, i (offer.id)}
						<li>
							<a
								href={resolve('/(dock)/offers/[id]', { id: offer.id })}
								class="pressable flex items-center gap-3 rounded-xl border border-base-300 p-3 hover:border-primary/30"
							>
								<span
									class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
								>
									{i + 1}
								</span>
								<span class="min-w-0 flex-1 truncate text-sm font-medium">{offer.name}</span>
								<span class="shrink-0 text-right text-xs text-base-content/60">
									<span class="block font-semibold text-base-content tabular-nums"
										>€{euro(offer.revenue)}</span
									>
									{offer.reservations}
									{offer.reservations === 1 ? 'booking' : 'bookings'}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="py-16 text-center text-sm text-base-content/50">No active offers to rank.</p>
			{/if}
		</Card>

		<Card class="animate-soft-pop stagger lg:col-span-2" padding="none" style="--i: {4}">
			<div class="p-5 sm:p-6">
				<h2 class="mb-4 text-base font-semibold">Location performance</h2>
			</div>
			{#if data.locationPerformanceData.length > 0}
				<div class="overflow-x-auto">
					<table class="table w-full table-sm">
						<thead>
							<tr class="border-base-300">
								<th class="text-xs tracking-wide text-base-content/60 uppercase">Location</th>
								<th class="text-xs tracking-wide text-base-content/60 uppercase">Bookings</th>
								<th class="text-xs tracking-wide text-base-content/60 uppercase">Revenue</th>
								<th
									class="hidden text-xs tracking-wide text-base-content/60 uppercase sm:table-cell"
								>
									Completed
								</th>
								<th
									class="hidden text-xs tracking-wide text-base-content/60 uppercase sm:table-cell"
								>
									Favorites
								</th>
							</tr>
						</thead>
						<tbody>
							{#each data.locationPerformanceData as location (location.id)}
								<tr class="border-base-300 hover:bg-base-200/50">
									<td>
										<a
											href={resolve('/(dock)/locations/[id]', { id: location.id })}
											class="font-medium hover:underline"
										>
											{location.name}
											<span class="block text-xs font-normal text-base-content/50">
												{location.address}, {location.city}
											</span>
										</a>
									</td>
									<td class="tabular-nums">{location.totalReservations}</td>
									<td class="font-semibold tabular-nums">€{euro(location.revenue)}</td>
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
									<td class="hidden text-xs tabular-nums sm:table-cell">
										{location.favoritesCount}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="px-5 pb-5 text-sm text-base-content/50">Add a location to see its performance.</p>
			{/if}
		</Card>
	</div>
</BaseLayout>
