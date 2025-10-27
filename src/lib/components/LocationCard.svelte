<!-- src/lib/components/LocationCard.svelte -->
<script lang="ts">
	import IconMapPin from '~icons/fluent/location-24-regular';
	import IconChevronDown from '~icons/fluent/chevron-down-24-regular';
	import IconChevronUp from '~icons/fluent/chevron-up-24-regular';
	import { Map, TileLayer, Popup, Marker } from 'sveaflet';
	import { browser } from '$app/environment';

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

	// Custom marker using Tailwind/DaisyUI classes
	const customMarkerHtml = `
		<div class="relative w-10 h-10">
			<div class="absolute top-1/2 left-1/2 w-10 h-10 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] border-[3px] border-white shadow-lg" style="border-radius: 50% 50% 50% 0;"></div>
			<div class="absolute top-1/2 left-1/2 w-4 h-4 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
		</div>
	`;
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
	{#if browser}
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
			<div class="mt-3 overflow-hidden rounded-xl border border-base-300 shadow-lg">
				<div class="h-[300px] w-full">
					<Map
						options={{
							center: [latitude, longitude],
							zoom: 15,
							minZoom: 1,
							maxZoom: 18
						}}
						class="h-full w-full"
					>
						<TileLayer
							url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}
							attribution={"&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"}
						/>
						<Marker latLng={[latitude, longitude]} width={40} height={40} html={customMarkerHtml}
						></Marker>
					</Map>
				</div>
			</div>
		{/if}
	{/if}
</div>
