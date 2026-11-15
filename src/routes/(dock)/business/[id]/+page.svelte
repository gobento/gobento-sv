<!-- src/routes/(dock)/business/[id]/+page.svelte -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import Seo from '#lib/components/Seo.svelte';
	import OptimizedLogoImage from '#lib/components/images/OptimizedLogoImage.svelte';
	import OptimizedLocationImage from '#lib/components/images/OptimizedLocationImage.svelte';
	import { businessTypeLabel } from '#lib/components/offers/format.js';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconChevronRight from '~icons/fluent/chevron-right-24-regular';
	import IconBack from '~icons/fluent/chevron-left-24-regular';

	let { data }: { data: PageData } = $props();

	const totalOffers = $derived(data.locations.reduce((sum, l) => sum + l.activeOffers, 0));
	const cities = $derived([...new Set(data.locations.map((l) => l.city))]);
	const backHref = $derived(
		data.fromLocationId
			? resolve('/(dock)/locations/[id]', { id: data.fromLocationId })
			: resolve('/(dock)/discover')
	);
</script>

<Seo
	title={data.business.name}
	description="{data.business.name}: {data.locations.length} {data.locations.length === 1
		? 'location'
		: 'locations'} on GoBento."
/>

<div class="page">
	<a
		href={backHref}
		class="-ms-2 mb-4 inline-flex min-h-11 items-center gap-0.5 rounded-full ps-1 pe-3 text-sm font-bold text-base-content/60 hover:bg-base-300/50 hover:text-base-content"
	>
		<IconBack class="size-5 rtl:rotate-180" />
		{data.fromLocationId ? 'Back to location' : 'Discover'}
	</a>

	<header class="surface mb-6 flex animate-rise-in items-center gap-4 p-5">
		<OptimizedLogoImage src={data.business.logoUrl} alt={data.business.name} size="md" shape="square" priority />
		<div class="min-w-0 flex-1">
			<h1 class="truncate text-2xl font-extrabold tracking-tight">{data.business.name}</h1>
			<p class="text-sm text-base-content/60">
				{businessTypeLabel(data.business.businessType)} · {cities.join(', ') || data.business.country}
			</p>
			{#if data.business.description}
				<p class="mt-2 line-clamp-3 text-sm text-base-content/80">{data.business.description}</p>
			{/if}
		</div>
	</header>

	<h2 class="mb-3 flex items-baseline justify-between gap-3 px-1">
		<span class="text-lg font-bold">
			{data.locations.length}
			{data.locations.length === 1 ? 'location' : 'locations'}
		</span>
		<span class="text-sm text-base-content/60">
			{totalOffers}
			{totalOffers === 1 ? 'offer' : 'offers'} available
		</span>
	</h2>

	{#if data.locations.length === 0}
		<p class="rounded-2xl border border-dashed border-base-300 p-6 text-sm text-base-content/60">
			This business has no locations yet.
		</p>
	{:else}
		<ul class="grid grid-cols-1 gap-3 md:grid-cols-2">
			{#each data.locations as location (location.id)}
				{@const current = location.id === data.fromLocationId}
				<li>
					<a
						href={resolve('/(dock)/locations/[id]', { id: location.id })}
						class="surface pressable flex items-center gap-3 overflow-hidden p-2 pe-3 {current
							? 'ring-2 ring-primary'
							: ''}"
						aria-current={current ? 'page' : undefined}
					>
						<div class="size-20 shrink-0 overflow-hidden rounded-xl bg-base-200">
							<OptimizedLocationImage src={location.imageUrl} alt={location.name} class="h-full w-full" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate font-semibold">
								{location.name}
								{#if current}<span class="badge ms-1 badge-sm badge-primary">You came from here</span>{/if}
							</p>
							<p class="flex items-center gap-1 truncate text-sm text-base-content/60">
								<IconLocation class="size-4 shrink-0" />
								{location.address}, {location.zipCode} {location.city}
							</p>
							<p
								class="mt-1 flex items-center gap-1 text-xs font-semibold {location.activeOffers > 0
									? 'text-primary'
									: 'text-base-content/50'}"
							>
								<IconTag class="size-3.5" />
								{location.activeOffers > 0
									? `${location.activeOffers} ${location.activeOffers === 1 ? 'offer' : 'offers'} available`
									: 'No offers right now'}
							</p>
						</div>
						<IconChevronRight class="size-5 shrink-0 text-base-content/40 rtl:rotate-180" />
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
