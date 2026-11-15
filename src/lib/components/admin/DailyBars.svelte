<!-- src/lib/components/admin/DailyBars.svelte -->
<script lang="ts">
	import { formatDayMonth } from '#lib/dates.js';

	interface Props {
		/** One entry per day, oldest first; `day` is YYYY-MM-DD. */
		rows: { day: string; value: number }[];
		label: string;
		unit: string;
	}

	let { rows, label, unit }: Props = $props();

	const width = 300;
	const height = 72;
	const max = $derived(Math.max(1, ...rows.map((row) => row.value)));
	const slot = $derived(width / Math.max(1, rows.length));
	const barWidth = $derived(Math.max(2, slot - 2));
	const total = $derived(rows.reduce((sum, row) => sum + row.value, 0));
	let hovered = $state<number | null>(null);
	const shown = $derived(hovered === null ? null : rows[hovered]);

	function barPath(x: number, h: number): string {
		const y = height - h;
		const r = Math.min(2, barWidth / 2, h);
		return `M${x},${height} V${y + r} Q${x},${y} ${x + r},${y} H${x + barWidth - r} Q${x + barWidth},${y} ${x + barWidth},${y + r} V${height} Z`;
	}
</script>

<div class="card bg-base-100 shadow">
	<div class="card-body gap-2">
		<div class="flex items-baseline justify-between gap-2">
			<h3 class="card-title text-base">{label}</h3>
			<span class="text-sm text-base-content/60" aria-live="polite">
				{#if shown}
					{formatDayMonth(shown.day)}: <strong class="text-base-content">{shown.value}</strong>
					{unit}
				{:else}
					<strong class="text-base-content">{total}</strong> {unit} in 30 days
				{/if}
			</span>
		</div>
		<svg
			viewBox="0 0 {width} {height}"
			class="h-20 w-full"
			preserveAspectRatio="none"
			role="img"
			aria-label="{label}, daily"
		>
			<line
				x1="0"
				x2={width}
				y1={height - 0.5}
				y2={height - 0.5}
				class="stroke-base-content/15"
				stroke-width="1"
			/>
			{#each rows as row, i (row.day)}
				{@const h = (row.value / max) * (height - 4)}
				{#if h > 0}
					<path
						d={barPath(i * slot + (slot - barWidth) / 2, h)}
						class="fill-primary {hovered !== null && hovered !== i ? 'opacity-40' : ''}"
					/>
				{/if}
				<rect
					x={i * slot}
					y="0"
					width={slot}
					{height}
					fill="transparent"
					role="presentation"
					onpointerenter={() => (hovered = i)}
					onpointerleave={() => (hovered = null)}
				/>
			{/each}
		</svg>
	</div>
</div>
