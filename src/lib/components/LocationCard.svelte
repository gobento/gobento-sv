<!-- src/lib/components/LocationCard.svelte -->
<script lang="ts">
	import IconMapPin from '~icons/fluent/location-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';

	interface LocationCardProps {
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
		address,
		city,
		province,
		zipCode,
		country,
		latitude,
		longitude,
		showTitle = true
	}: LocationCardProps = $props();

	const getGoogleMapsUrl = (lat: number, lng: number) => {
		return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
	};

	const fullAddress = $derived(
		[address, zipCode, city, province, country].filter(Boolean).join(', ')
	);
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

	<a
		href={getGoogleMapsUrl(latitude, longitude)}
		target="_blank"
		rel="noopener noreferrer"
		class="group block rounded-xl bg-base-200 p-4 transition-all hover:bg-base-300"
	>
		<div class="flex items-start justify-between gap-3">
			<div class="flex-1 space-y-1">
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
				<IconArrowRight class="size-4" />
			</div>
		</div>
	</a>
</div>
