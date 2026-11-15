<!-- src/routes/(dock)/admin/telemetry/+page.svelte -->
<script lang="ts">
	import BaseLayout from '#lib/components/BaseLayout.svelte';
	import { formatDateTime, formatTimeOfDay, formatDayMonth } from '#lib/dates.js';
	import { displayRoute } from '#lib/telemetry.js';
	import IconPulse from '~icons/fluent/pulse-24-filled';
	import IconGauge from '~icons/fluent/top-speed-24-regular';
	import IconBug from '~icons/fluent/bug-24-regular';
	import IconRoute from '~icons/fluent/arrow-routing-24-regular';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const rangeLabels: Record<string, string> = {
		'24h': '24 hours',
		'7d': '7 days',
		'30d': '30 days'
	};

	const vitalInfo: Record<string, { label: string; good: number; poor: number; unit: 'ms' | '' }> =
		{
			ttfb: { label: 'Time to first byte', good: 800, poor: 1800, unit: 'ms' },
			fcp: { label: 'First contentful paint', good: 1800, poor: 3000, unit: 'ms' },
			lcp: { label: 'Largest contentful paint', good: 2500, poor: 4000, unit: 'ms' },
			cls: { label: 'Layout shift', good: 0.1, poor: 0.25, unit: '' },
			inp: { label: 'Interaction delay', good: 200, poor: 500, unit: 'ms' },
			nav: { label: 'In-app navigation', good: 500, poor: 1500, unit: 'ms' }
		};

	function ms(value: number | null): string {
		if (value === null) return '–';
		return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
	}

	function vitalValue(name: string, value: number | null): string {
		if (value === null) return '–';
		return vitalInfo[name]?.unit === '' ? value.toFixed(3) : ms(value);
	}

	function rating(name: string, value: number | null): { label: string; badge: string } | null {
		const info = vitalInfo[name];
		if (value === null || !info) return null;
		if (value <= info.good) return { label: 'Good', badge: 'badge-success' };
		if (value <= info.poor) return { label: 'Needs work', badge: 'badge-warning' };
		return { label: 'Poor', badge: 'badge-error' };
	}

	function percent(part: number, whole: number): string {
		if (!whole) return '0 %';
		const value = (part / whole) * 100;
		return `${value < 10 ? value.toFixed(1) : Math.round(value)} %`;
	}

	const bucketLabel = (iso: string) =>
		data.bucket === 'hour' ? formatTimeOfDay(iso) : formatDayMonth(iso);

	// --- Requests timeline (single series bar chart) ---
	const chart = { width: 720, height: 180, top: 12, bottom: 22, left: 36, right: 8 };
	const maxRequests = $derived(Math.max(1, ...data.timeline.map((row) => row.requests)));
	const plotHeight = chart.height - chart.top - chart.bottom;
	const plotWidth = chart.width - chart.left - chart.right;
	const slot = $derived(plotWidth / Math.max(1, data.timeline.length));
	const barWidth = $derived(Math.max(2, Math.min(28, slot - 2)));
	const ticks = $derived([0, Math.round(maxRequests / 2), maxRequests]);
	const labelEvery = $derived(Math.max(1, Math.ceil(data.timeline.length / 8)));
	let hovered = $state<number | null>(null);
	const hoveredRow = $derived(hovered === null ? null : data.timeline[hovered]);

	function barPath(x: number, y: number, w: number, h: number): string {
		const r = Math.min(4, w / 2, h);
		return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
	}

	let openStack = $state<number | null>(null);
</script>

<BaseLayout
	title="Telemetry"
	description="Server response times, errors and real-user performance"
	icon={IconPulse}
>
	{#snippet actions()}
		<div class="join">
			{#each data.ranges as range (range)}
				<a
					href="?range={range}"
					class="btn join-item btn-sm {data.range === range ? 'btn-primary' : 'btn-outline'}"
					data-sveltekit-noscroll>{rangeLabels[range]}</a
				>
			{/each}
		</div>
	{/snippet}

	<!-- Headline numbers -->
	<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Requests</div>
				<div class="stat-value text-2xl">{data.summary.requests.toLocaleString('en-US')}</div>
				<div class="stat-desc">Last {rangeLabels[data.range]}</div>
			</div>
		</div>
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Server error rate</div>
				<div class="stat-value text-2xl">
					{percent(data.summary.serverErrors, data.summary.requests)}
				</div>
				<div class="stat-desc">
					{data.summary.serverErrors} × 5xx · {data.summary.clientErrors} × 4xx
				</div>
			</div>
		</div>
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Response time</div>
				<div class="stat-value text-2xl">{ms(data.summary.p50)}</div>
				<div class="stat-desc">Median · p95 {ms(data.summary.p95)}</div>
			</div>
		</div>
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Errors</div>
				<div class="stat-value text-2xl">{data.summary.crashes + data.summary.browserErrors}</div>
				<div class="stat-desc">
					{data.summary.crashes} server crashes · {data.summary.browserErrors} in browsers
				</div>
			</div>
		</div>
	</div>

	<!-- Timeline -->
	<div class="card mb-8 bg-base-100 shadow">
		<div class="card-body">
			<h2 class="card-title text-base">
				Requests per {data.bucket}
			</h2>
			{#if data.timeline.length === 0}
				<p class="text-base-content/60">No requests recorded in this range yet.</p>
			{:else}
				<div class="relative">
					<svg
						viewBox="0 0 {chart.width} {chart.height}"
						class="w-full"
						role="img"
						aria-label="Requests per {data.bucket}"
					>
						{#each ticks as tick (tick)}
							{@const y = chart.top + plotHeight - (tick / maxRequests) * plotHeight}
							<line
								x1={chart.left}
								x2={chart.width - chart.right}
								y1={y}
								y2={y}
								class="stroke-base-content/10"
								stroke-width="1"
							/>
							<text
								x={chart.left - 6}
								y={y + 3}
								text-anchor="end"
								class="fill-base-content/50 text-[10px]">{tick}</text
							>
						{/each}
						{#each data.timeline as row, i (row.bucket)}
							{@const h = (row.requests / maxRequests) * plotHeight}
							{@const x = chart.left + i * slot + (slot - barWidth) / 2}
							{#if h > 0}
								<path
									d={barPath(x, chart.top + plotHeight - h, barWidth, h)}
									class="fill-primary transition-opacity {hovered !== null && hovered !== i
										? 'opacity-40'
										: ''}"
								/>
							{/if}
							<rect
								x={chart.left + i * slot}
								y={chart.top}
								width={slot}
								height={plotHeight}
								fill="transparent"
								role="presentation"
								onpointerenter={() => (hovered = i)}
								onpointerleave={() => (hovered = null)}
							/>
							{#if i % labelEvery === 0}
								<text
									x={chart.left + i * slot + slot / 2}
									y={chart.height - 6}
									text-anchor="middle"
									class="fill-base-content/50 text-[10px]">{bucketLabel(row.bucket)}</text
								>
							{/if}
						{/each}
					</svg>
					{#if hoveredRow && hovered !== null}
						<div
							class="pointer-events-none absolute top-0 z-10 rounded-box border border-base-300 bg-base-100 px-3 py-2 text-sm shadow"
							style="left: clamp(0px, calc({((chart.left + hovered * slot + slot / 2) /
								chart.width) *
								100}% - 80px), calc(100% - 160px)); width: 160px"
						>
							<div class="font-medium">
								{data.bucket === 'hour'
									? formatDateTime(hoveredRow.bucket)
									: formatDayMonth(hoveredRow.bucket)}
							</div>
							<div class="text-base-content/70">{hoveredRow.requests} requests</div>
							<div class="text-base-content/70">{hoveredRow.errors} × 5xx</div>
							<div class="text-base-content/70">p95 {ms(hoveredRow.p95)}</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Real-user performance -->
	<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
		<IconGauge class="size-5 text-primary" /> Real-user performance
	</h2>
	<p class="mb-3 text-sm text-base-content/60">75th percentile measured in visitors' browsers.</p>
	<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.vitals as vital (vital.name)}
			{@const verdict = rating(vital.name, vital.p75)}
			<div class="stats shadow">
				<div class="stat">
					<div class="stat-title">{vitalInfo[vital.name]?.label ?? vital.name}</div>
					<div class="stat-value flex items-center gap-2 text-2xl">
						{vitalValue(vital.name, vital.p75)}
						{#if verdict}
							<span class="badge {verdict.badge} badge-sm">{verdict.label}</span>
						{/if}
					</div>
					<div class="stat-desc">
						{vital.samples} samples · {vital.name.toUpperCase()}
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if data.slowPages.length > 0}
		<div class="card mb-8 bg-base-100 shadow">
			<div class="card-body">
				<h3 class="card-title text-base">Slowest pages to render (LCP p75)</h3>
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr>
								<th>Page</th>
								<th class="text-right">Samples</th>
								<th class="text-right">LCP p75</th>
							</tr>
						</thead>
						<tbody>
							{#each data.slowPages as row (row.route)}
								<tr>
									<td class="font-mono text-xs">{displayRoute(row.route)}</td>
									<td class="text-right">{row.samples}</td>
									<td class="text-right">{ms(row.p75)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}

	<!-- Routes -->
	<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
		<IconRoute class="size-5 text-primary" /> Busiest routes
	</h2>
	<div class="mb-8 overflow-x-auto rounded-box border border-base-300">
		<table class="table table-sm">
			<thead>
				<tr>
					<th>Route</th>
					<th class="text-right">Requests</th>
					<th class="text-right">5xx</th>
					<th class="text-right">Median</th>
					<th class="text-right">p95</th>
				</tr>
			</thead>
			<tbody>
				{#each data.routes as row (row.route)}
					<tr>
						<td class="font-mono text-xs">{displayRoute(row.route)}</td>
						<td class="text-right">{row.requests}</td>
						<td class="text-right {row.errors ? 'font-semibold text-error' : ''}">{row.errors}</td>
						<td class="text-right">{ms(row.p50)}</td>
						<td class="text-right">{ms(row.p95)}</td>
					</tr>
				{:else}
					<tr><td colspan="5" class="text-base-content/50">No requests recorded yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="mb-8 grid gap-6 lg:grid-cols-2">
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h3 class="card-title text-base">Requests by account type</h3>
				<div class="flex flex-wrap gap-2">
					{#each data.byAccountType as row (row.key)}
						<span class="badge gap-1 badge-lg badge-neutral">
							{row.key}: <strong>{percent(row.count, data.summary.requests)}</strong>
						</span>
					{:else}
						<span class="text-base-content/50">No data</span>
					{/each}
				</div>
			</div>
		</div>
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h3 class="card-title text-base">Requests by device</h3>
				<div class="flex flex-wrap gap-2">
					{#each data.byDevice as row (row.key)}
						<span class="badge gap-1 badge-lg badge-neutral">
							{row.key}: <strong>{percent(row.count, data.summary.requests)}</strong>
						</span>
					{:else}
						<span class="text-base-content/50">No data</span>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Errors -->
	<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
		<IconBug class="size-5 text-primary" /> Errors
	</h2>
	<div class="space-y-2">
		{#each data.errors as error, i (error.kind + error.message)}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body gap-1 p-4">
					<div class="flex flex-wrap items-center gap-2">
						<span
							class="badge badge-sm {error.kind === 'server_error'
								? 'badge-error'
								: 'badge-warning'}"
						>
							{error.kind === 'server_error' ? `Server ${error.status ?? ''}` : 'Browser'}
						</span>
						<span class="font-mono text-xs text-base-content/60">{displayRoute(error.route)}</span>
						<span class="ml-auto text-xs text-base-content/60">
							{error.occurrences}× · last {formatDateTime(error.lastSeen)}
						</span>
					</div>
					<p class="font-medium break-words">{error.message}</p>
					{#if error.errorId}
						<p class="font-mono text-xs text-base-content/50">Error id {error.errorId}</p>
					{/if}
					{#if error.stack}
						<button
							type="button"
							class="w-fit link text-xs link-primary"
							onclick={() => (openStack = openStack === i ? null : i)}
						>
							{openStack === i ? 'Hide' : 'Show'} stack trace
						</button>
						{#if openStack === i}
							<pre
								class="max-h-64 overflow-auto rounded-box bg-base-200 p-3 text-xs whitespace-pre-wrap">{error.stack}</pre>
						{/if}
					{/if}
				</div>
			</div>
		{:else}
			<p class="text-base-content/60">No errors in the last {rangeLabels[data.range]}.</p>
		{/each}
	</div>

	<p class="mt-8 text-xs text-base-content/50">
		Events are kept for {data.retentionDays} days. Requests are grouped by route, never by concrete URL,
		and store only the account type, not who made them.
	</p>
</BaseLayout>
