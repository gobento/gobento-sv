<!-- src/lib/components/LocationCard.svelte -->
<script lang="ts">
	import IconMapPin from '~icons/fluent/location-24-regular';
	import IconChevronDown from '~icons/fluent/chevron-down-24-regular';
	import IconChevronUp from '~icons/fluent/chevron-up-24-regular';
	import IconFluentMap24Regular from '~icons/fluent/map-24-regular';

	interface LocationCardProps {
		name: string;
		address: string;
		city: string;
		province?: string | null;
		zipCode: string;
		country: string;
		latitude: number;
		longitude: number;
		showTitle?: boolean;
	}

	let {
		name,
		address,
		city,
		province,
		zipCode,
		country,
		latitude,
		longitude,
		showTitle = true
	}: LocationCardProps = $props();

	let isExpanded = $state(false);

	const toggleMap = () => {
		isExpanded = !isExpanded;
	};
</script>

<div>
	{#if showTitle}
		<div class="mb-3 flex items-center gap-2">
			<div class="rounded-lg bg-primary/10 p-2">
				<IconMapPin class="size-5 text-primary" />
			</div>
			<h3 class="text-lg font-bold text-base-content">Pickup Location</h3>
		</div>
	{/if}

	<button
		onclick={toggleMap}
		class="group btn h-auto min-h-0 w-full justify-start rounded-xl bg-base-200 p-4 normal-case btn-ghost hover:bg-base-300"
	>
		<div class="flex w-full items-start justify-between gap-3">
			<div class="flex-1 space-y-1 text-left">
				<p class="font-bold text-base-content">{name}</p>
				<p class="font-semibold text-base-content/90">{address}</p>
				<p class="text-sm font-medium text-base-content/70">
					{zipCode}
					{city}{#if province}, {province}{/if}
				</p>
				{#if country}
					<p class="text-xs font-medium text-base-content/60">{country}</p>
				{/if}
			</div>
			<div
				class="rounded-full bg-primary/10 p-1.5 transition-all group-hover:bg-primary group-hover:text-primary-content"
			>
				{#if isExpanded}
					<IconChevronUp class="size-4" />
				{:else}
					<IconChevronDown class="size-4" />
				{/if}
			</div>
		</div>
	</button>

	{#if isExpanded}
		<div class="mt-3 h-[300px] w-full overflow-hidden rounded-xl border border-base-200">
			{#await import('$lib/components/maps/MarkedMap.svelte')}
				<div class="flex h-full items-center justify-center">
					<IconFluentMap24Regular class="size-12 animate-pulse text-base-content/50" />
				</div>
			{:then { default: MarkedMap }}
				<MarkedMap {latitude} {longitude} />
			{/await}
		</div>
	{/if}
</div>
