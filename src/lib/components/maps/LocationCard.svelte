<!-- Address block with an on-demand map and a directions link. -->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import IconMapPin from '~icons/fluent/location-24-regular';
	import IconMap from '~icons/fluent/map-24-regular';
	import IconDirections from '~icons/fluent/directions-24-regular';
	import IconTile from '#lib/components/ui/IconTile.svelte';
	import Skeleton from '#lib/components/ui/Skeleton.svelte';
	import { directionsUrl } from './leaflet';

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
		/** Start with the map open (detail pages); it still loads lazily. */
		expanded?: boolean;
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
		showTitle = true,
		expanded = false
	}: LocationCardProps = $props();

	// svelte-ignore state_referenced_locally
	let isExpanded = $state(expanded);
	const mapId = $props.id();
</script>

<div>
	{#if showTitle}
		<h3 class="eyebrow mb-2">Pickup location</h3>
	{/if}

	<div class="overflow-hidden rounded-2xl bg-base-200/60">
		<div class="flex items-start gap-3 p-3.5">
			<IconTile icon={IconMapPin} size="md" />
			<div class="min-w-0 flex-1">
				<p class="truncate font-extrabold">{name}</p>
				<p class="text-sm text-base-content/70">{address}</p>
				<p class="text-sm text-base-content/70">
					{zipCode}
					{city}{#if province}, {province}{/if}{#if country}, {country}{/if}
				</p>
			</div>
		</div>

		{#if isExpanded}
			<div id={mapId} class="h-52 w-full sm:h-64" transition:slide={{ duration: 220 }}>
				{#await import('./MarkedMap.svelte')}
					<Skeleton class="size-full rounded-none" />
				{:then { default: MarkedMap }}
					<MarkedMap {latitude} {longitude} />
				{:catch}
					<p class="flex size-full items-center justify-center text-sm text-base-content/60">
						The map could not be loaded.
					</p>
				{/await}
			</div>
		{/if}

		<div class="grid grid-cols-2 gap-px border-t border-base-300/70 bg-base-300/70">
			<button
				type="button"
				class="flex min-h-12 items-center justify-center gap-2 bg-base-200/60 text-sm font-bold transition-colors hover:bg-base-200 hover:text-primary"
				aria-expanded={isExpanded}
				aria-controls={mapId}
				onclick={() => (isExpanded = !isExpanded)}
			>
				<IconMap class="size-5" />
				{isExpanded ? 'Hide map' : 'Show map'}
			</button>
			<a
				href={directionsUrl(latitude, longitude)}
				target="_blank"
				rel="noopener noreferrer"
				class="flex min-h-12 items-center justify-center gap-2 bg-base-200/60 text-sm font-bold transition-colors hover:bg-base-200 hover:text-primary"
			>
				<IconDirections class="size-5" />
				Directions
			</a>
		</div>
	</div>
</div>
