<!-- src/routes/(dock)/discover/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconTimer from '~icons/fluent/timer-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconMap from '~icons/fluent/map-24-regular';
	import IconCompass from '~icons/fluent/compass-northwest-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconSparkle from '~icons/fluent/sparkle-24-filled';
	import IconStore from '~icons/fluent/building-retail-24-regular';

	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import PriceDisplay from '$lib/components/PriceDisplay.svelte';
	import NotFound from '$lib/components/NotFound.svelte';
	import OptimizedLogoImage from '$lib/components/images/OptimizedLogoImage.svelte';
	import OptimizedLocationImage from '$lib/components/images/OptimizedLocationImage.svelte';

	import { formatDistance } from '$lib/util';
	import { useImagePreloader, extractImageUrls } from '$lib/utils/imagePreloader.svelte';
	import { page } from '$app/state';

	let { data }: { data: PageData } = $props();

	// Preload images from offers
	useImagePreloader(() => extractImageUrls(data.offers));

	let currentTime = $state(new Date());
	let interval: ReturnType<typeof setInterval>;

	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let isSearching = $state(false);
	let showResults = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout>;
	let selectedLocation = $state<{ name: string; lat: number; lon: number } | null>(null);
	let selectedTypes = $state<string[]>(['all']);

	const businessTypes = [
		{ value: 'all', label: 'All' },
		{ value: 'bakery', label: 'Bakery' },
		{ value: 'restaurant', label: 'Restaurant' },
		{ value: 'cafe', label: 'Café' },
		{ value: 'grocery', label: 'Grocery' },
		{ value: 'supermarket', label: 'Supermarket' },
		{ value: 'hotel', label: 'Hotel' },
		{ value: 'catering', label: 'Catering' },
		{ value: 'other', label: 'Other' }
	];

	onMount(() => {
		interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		if (browser) {
			const savedTypes = localStorage.getItem('filterTypes');
			if (savedTypes) selectedTypes = JSON.parse(savedTypes);

			const saved = localStorage.getItem('userLocation');
			if (saved) {
				selectedLocation = JSON.parse(saved);
				if (selectedLocation) searchQuery = selectedLocation.name;

				// If the page was opened without location params, restore the last
				// used location so nearby results are shown right away.
				if (!page.url.searchParams.has('lat')) updateUrl();
			}
		}
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (searchTimeout) clearTimeout(searchTimeout);
	});

	async function searchLocation() {
		if (searchQuery.length < 3) {
			searchResults = [];
			showResults = false;
			return;
		}

		isSearching = true;
		clearTimeout(searchTimeout);

		searchTimeout = setTimeout(async () => {
			try {
				const response = await fetch(
					`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
				);
				searchResults = await response.json();
				showResults = true;
			} catch (error) {
				console.error('Search error:', error);
				searchResults = [];
			} finally {
				isSearching = false;
			}
		}, 500);
	}

	function selectLocation(result: any) {
		const location = {
			name: result.display_name,
			lat: parseFloat(result.lat),
			lon: parseFloat(result.lon)
		};
		selectedLocation = location;
		if (browser) localStorage.setItem('userLocation', JSON.stringify(location));
		searchQuery = result.display_name;
		showResults = false;
		updateUrl();
	}

	function useCurrentLocation() {
		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				async (position) => {
					const { latitude, longitude } = position.coords;
					try {
						const response = await fetch(
							`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
						);
						const result = await response.json();
						const location = { name: result.display_name, lat: latitude, lon: longitude };
						selectedLocation = location;
						if (browser) localStorage.setItem('userLocation', JSON.stringify(location));
						searchQuery = result.display_name;
						updateUrl();
					} catch (error) {
						console.error('Reverse geocoding error:', error);
					}
				},
				(error) => {
					console.error('Geolocation error:', error);
					alert('Unable to get your location. Please search manually.');
				}
			);
		}
	}

	function clearLocation() {
		selectedLocation = null;
		searchQuery = '';
		if (browser) localStorage.removeItem('userLocation');
		updateUrl();
	}

	function updateUrl() {
		const params = new URLSearchParams(page.url.searchParams);

		if (selectedLocation) {
			params.set('lat', selectedLocation.lat.toString());
			params.set('lon', selectedLocation.lon.toString());
		} else {
			params.delete('lat');
			params.delete('lon');
		}

		const typesToSend = selectedTypes.includes('all') ? [] : selectedTypes;
		if (typesToSend.length > 0) {
			params.set('types', typesToSend.join(','));
		} else {
			params.delete('types');
		}

		goto(`?${params.toString()}`, { replaceState: true, keepFocus: true });
	}

	function handleTypeToggle(type: string) {
		if (type === 'all') {
			selectedTypes = ['all'];
		} else {
			const filtered = selectedTypes.filter((t) => t !== 'all');
			if (filtered.includes(type)) {
				const newTypes = filtered.filter((t) => t !== type);
				selectedTypes = newTypes.length === 0 ? ['all'] : newTypes;
			} else {
				selectedTypes = [...filtered, type];
			}
		}

		if (browser) localStorage.setItem('filterTypes', JSON.stringify(selectedTypes));
		updateUrl();
	}

	function goToMap() {
		const params = new URLSearchParams();
		if (selectedLocation) {
			params.set('lat', selectedLocation.lat.toString());
			params.set('lon', selectedLocation.lon.toString());
		}
		const typesToSend = selectedTypes.includes('all') ? [] : selectedTypes;
		if (typesToSend.length > 0) params.set('types', typesToSend.join(','));
		goto(`/map?${params.toString()}`);
	}

	function getPickupTimeRemaining(pickupTimeUntil: string, currentTime: Date) {
		const now = currentTime;
		const todayDateStr = now.toISOString().split('T')[0];
		const pickupEndTime = new Date(`${todayDateStr}T${pickupTimeUntil}`);
		const diff = pickupEndTime.getTime() - now.getTime();
		const totalMinutes = Math.floor(diff / (1000 * 60));
		return { diff, totalMinutes };
	}

	const hasMapData = $derived(
		data.offers.some(
			(offer) => offer?.location && offer.distance !== null && offer.business?.logo?.url
		)
	);

	const resultCount = $derived(data.offers.filter((o) => o?.business?.logo).length);

	const businessTypeLabels: Record<string, string> = {
		bakery: 'Bakery',
		restaurant: 'Restaurant',
		cafe: 'Café',
		grocery: 'Grocery',
		supermarket: 'Supermarket',
		hotel: 'Hotel',
		catering: 'Catering',
		other: 'Business'
	};

	function typeLabel(type: string) {
		return businessTypeLabels[type] ?? 'Business';
	}
</script>

<div class="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:px-6">
	<!-- Header -->
	<header class="mb-5 flex items-center gap-3">
		<div class="flex size-11 items-center justify-center rounded-2xl bg-primary/10">
			<IconCompass class="size-6 text-primary" />
		</div>
		<div>
			<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Discover</h1>
			<p class="text-sm text-base-content/60">Grab great food near you before it's gone</p>
		</div>
	</header>

	<!-- Sticky search + filters bar -->
	<div
		class="sticky top-0 z-20 -mx-4 mb-6 bg-base-100/80 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6"
	>
		<div class="flex items-center gap-2">
			{#if hasMapData}
				<button
					type="button"
					class="btn btn-circle btn-primary"
					onclick={goToMap}
					title="View map"
					aria-label="View map"
				>
					<IconMap class="size-5" />
				</button>
			{/if}

			<div class="relative flex-1">
				<IconSearch
					class="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-base-content/40"
				/>
				<input
					type="text"
					placeholder="Search a city or address..."
					class="input w-full rounded-full border-base-300 bg-base-200 pr-11 pl-12 focus:bg-base-100"
					bind:value={searchQuery}
					oninput={searchLocation}
					onfocus={() => {
						if (searchResults.length > 0) showResults = true;
					}}
				/>

				{#if searchQuery}
					<button
						type="button"
						class="btn btn-circle btn-ghost btn-xs absolute top-1/2 right-2 -translate-y-1/2 text-base-content/50"
						onclick={clearLocation}
						aria-label="Clear location"
					>
						<IconDismiss class="size-4" />
					</button>
				{/if}

				{#if showResults && searchResults.length > 0}
					<div
						class="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xl"
					>
						{#each searchResults as result}
							<button
								type="button"
								class="w-full border-b border-base-200 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-base-200"
								onclick={() => selectLocation(result)}
							>
								<div class="flex items-start gap-2">
									<IconLocation class="mt-0.5 size-5 shrink-0 text-primary" />
									<span class="text-sm">{result.display_name}</span>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<button
				type="button"
				class="btn btn-circle border-base-300 bg-base-200 hover:bg-base-300"
				onclick={useCurrentLocation}
				title="Use current location"
				aria-label="Use current location"
			>
				<IconLocation class="size-5" />
			</button>
		</div>

		<!-- Category chips (horizontally scrollable) -->
		<div
			class="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
		>
			{#each businessTypes as type}
				<button
					type="button"
					class="btn btn-sm shrink-0 rounded-full {selectedTypes.includes(type.value)
						? 'btn-primary'
						: 'border-base-300 bg-base-200 btn-ghost'}"
					onclick={() => handleTypeToggle(type.value)}
				>
					{type.label}
				</button>
			{/each}
		</div>
	</div>

	{#snippet dealCard(deal: (typeof data.specialDeals)[number])}
		<a
			href="/offers/{deal.offer.id}"
			class="group block rounded-3xl bg-linear-to-br from-primary via-primary to-secondary p-[2px] shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
		>
			<div class="flex gap-3 rounded-[22px] bg-base-100 p-3">
				<!-- Thumbnail -->
				<div
					class="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-linear-to-br from-primary/20 via-secondary/10 to-accent/10"
				>
					{#if deal.offer.imageUrl}
						<OptimizedLocationImage
							src={deal.offer.imageUrl}
							alt={deal.offer.name}
							class="h-full w-full transition-transform duration-300 group-hover:scale-105"
						/>
					{:else}
						<div class="flex h-full w-full items-center justify-center">
							<OptimizedLogoImage
								src={deal.offer.business.logo.url}
								alt={deal.offer.business.name}
								size="lg"
								shape="circle"
							/>
						</div>
					{/if}
				</div>

				<!-- Info -->
				<div class="flex min-w-0 flex-1 flex-col">
					<span
						class="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary"
					>
						<IconSparkle class="size-3" />
						{deal.label}
					</span>
					<h3 class="line-clamp-1 font-bold">{deal.offer.name}</h3>
					<p class="mb-1 line-clamp-1 text-sm text-base-content/60">
						{deal.offer.business.name}
						{#if deal.offer.location}
							· {deal.offer.location.city}{#if deal.offer.distance !== null}
								· {formatDistance(deal.offer.distance)}{/if}
						{/if}
					</p>
					<div class="mt-auto">
						<PriceDisplay
							originalValue={deal.offer.originalValue}
							price={deal.offer.price}
							country={deal.offer.business.country}
							size="sm"
						/>
					</div>
				</div>
			</div>
		</a>
	{/snippet}

	<!-- Special deals (shown regardless of the active category filter) -->
	{#if data.specialDeals.length > 0}
		<section class="mb-8">
			<div class="mb-3 flex items-center gap-2">
				<IconSparkle class="size-5 text-primary" />
				<h2 class="text-lg font-bold">Special deals{selectedLocation ? ' nearby' : ''}</h2>
			</div>

			<!-- Desktop: every deal side by side -->
			<div class="hidden gap-4 sm:grid sm:grid-cols-2">
				{#each data.specialDeals as deal (deal.type)}
					{@render dealCard(deal)}
				{/each}
			</div>

			<!-- Mobile: just the first deal here; any second one appears between
				 sections further down -->
			<div class="grid sm:hidden">
				{@render dealCard(data.specialDeals[0])}
			</div>
		</section>
	{/if}

	<!-- Content -->
	{#if resultCount === 0}
		<NotFound
			icon={IconTag}
			title="No matching offers found"
			description="Try a different location or category — new offers appear all the time!"
		/>
	{:else}
		<!-- Places / locations -->
		{#if data.locations.length > 0}
			<section class="mb-8">
				<div class="mb-3 flex items-center gap-2">
					<IconStore class="size-5 text-primary" />
					<h2 class="text-lg font-bold">Places to explore</h2>
				</div>

				<div
					class="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				>
					{#each data.locations as loc (loc.id)}
						<a
							href="/locations/{loc.id}"
							class="group flex w-60 shrink-0 flex-col overflow-hidden rounded-3xl bg-base-100 shadow-sm ring-1 ring-base-200 transition-all duration-200 outline-primary outline-offset-2 hover:-translate-y-1 hover:shadow-xl hover:outline-2"
						>
							<div
								class="relative h-32 overflow-hidden bg-linear-to-br from-primary/20 via-secondary/10 to-accent/10"
							>
								{#if loc.imageUrl}
									<OptimizedLocationImage
										src={loc.imageUrl}
										alt={loc.name}
										class="h-full w-full transition-transform duration-300 group-hover:scale-105"
									/>
								{/if}
								<div
									class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/50 to-transparent"
								></div>

								<!-- Offer count badge -->
								<span
									class="badge badge-primary badge-sm absolute top-3 right-3 border-0 font-semibold shadow"
								>
									{loc.offerCount}
									{loc.offerCount === 1 ? 'offer' : 'offers'}
								</span>

								<!-- Logo overlay -->
								<div class="absolute bottom-3 left-3">
									<OptimizedLogoImage
										src={loc.logoUrl}
										alt={loc.businessName}
										size="sm"
										shape="circle"
									/>
								</div>
							</div>

							<div class="flex flex-1 flex-col gap-1 p-4">
								<p class="text-xs font-medium text-primary">{typeLabel(loc.businessType)}</p>
								<h3 class="line-clamp-1 font-bold">{loc.name}</h3>
								<div class="flex items-center gap-1 text-sm text-base-content/60">
									<IconLocation class="size-4 shrink-0" />
									<span class="truncate">{loc.city}</span>
									{#if loc.distance !== null}
										<span class="font-medium text-base-content/80"
											>· {formatDistance(loc.distance)}</span
										>
									{/if}
								</div>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Mobile: second special deal, placed between locations and offers -->
		{#if data.specialDeals.length > 1}
			<section class="mb-8 sm:hidden">
				<div class="mb-3 flex items-center gap-2">
					<IconSparkle class="size-5 text-primary" />
					<h2 class="text-lg font-bold">One more deal</h2>
				</div>
				<div class="grid">
					{@render dealCard(data.specialDeals[1])}
				</div>
			</section>
		{/if}

		<!-- All offers -->
		<div class="mb-4 flex items-baseline justify-between">
			<h2 class="text-lg font-bold">
				{selectedLocation ? 'Near you' : 'Available now'}
			</h2>
			<span class="text-sm text-base-content/50">
				{resultCount}
				{resultCount === 1 ? 'offer' : 'offers'}
			</span>
		</div>

		{#snippet offerCard(offer: (typeof data.offers)[number])}
			{@const timeRemaining = getPickupTimeRemaining(offer.pickupTimeUntil, currentTime)}
			{@const soonEnding = timeRemaining.diff > 0 && timeRemaining.totalMinutes <= 30}
			{@const ended = timeRemaining.diff <= 0}
			<a
				href="/offers/{offer.id}"
				class="group flex h-full flex-col overflow-hidden rounded-3xl bg-base-100 shadow-sm ring-1 ring-base-200 transition-all duration-200 outline-primary outline-offset-2 hover:-translate-y-1 hover:shadow-xl hover:outline-2"
			>
				<!-- Photo -->
				<div
					class="relative h-44 overflow-hidden bg-linear-to-br from-primary/20 via-secondary/10 to-accent/10"
				>
					{#if offer.imageUrl}
						<OptimizedLocationImage
							src={offer.imageUrl}
							alt={offer.name}
							class="h-full w-full transition-transform duration-300 group-hover:scale-105"
						/>
					{:else}
						<div class="flex h-full w-full items-center justify-center">
							<OptimizedLogoImage
								src={offer.business.logo.url}
								alt={offer.business.name}
								size="xl"
								shape="circle"
								priority={false}
							/>
						</div>
					{/if}

					<!-- Gradient for legibility -->
					<div
						class="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/50 to-transparent"
					></div>

					<!-- Discount badge -->
					<div class="absolute top-3 left-3">
						<span class="badge badge-primary badge-lg border-0 font-bold shadow-md">
							-{Math.round(((offer.originalValue - offer.price) / offer.originalValue) * 100)}%
						</span>
					</div>

					<!-- Urgency / recurring badge -->
					<div class="absolute top-3 right-3 flex flex-col items-end gap-1.5">
						{#if soonEnding}
							<span
								class="badge badge-error badge-sm gap-1 border-0 font-semibold text-error-content shadow"
							>
								<IconTimer class="size-3" />
								{timeRemaining.totalMinutes}min left
							</span>
						{:else if ended}
							<span
								class="badge badge-sm gap-1 border-0 bg-neutral font-semibold text-neutral-content shadow"
							>
								Pickup ended
							</span>
						{/if}
						{#if offer.isRecurring}
							<span class="badge badge-secondary badge-sm gap-1 border-0 font-semibold shadow">
								<IconCalendar class="size-3" />
								Recurring
							</span>
						{/if}
					</div>

					<!-- Business logo + name overlay -->
					<div class="absolute inset-x-3 bottom-3 flex items-center gap-2">
						<OptimizedLogoImage
							src={offer.business.logo.url}
							alt={offer.business.name}
							size="sm"
							shape="circle"
							priority={false}
						/>
						<span class="truncate text-sm font-semibold text-white drop-shadow">
							{offer.business.name}
						</span>
					</div>
				</div>

				<!-- Info -->
				<div class="flex flex-1 flex-col gap-3 p-4">
					<h3 class="line-clamp-2 leading-snug font-bold">{offer.name}</h3>

					<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-base-content/60">
						{#if offer.location}
							<span class="flex items-center gap-1">
								<IconLocation class="size-4" />
								<span class="truncate">{offer.location.city}</span>
								{#if offer.distance !== null}
									<span class="font-medium text-base-content/80"
										>· {formatDistance(offer.distance)}</span
									>
								{/if}
							</span>
						{/if}
						<span class="flex items-center gap-1">
							<IconClock class="size-4" />
							{offer.pickupTimeFrom.slice(0, 5)} - {offer.pickupTimeUntil.slice(0, 5)}
						</span>
					</div>

					<div class="mt-auto flex items-end justify-between pt-1">
						<PriceDisplay
							originalValue={offer.originalValue}
							price={offer.price}
							country={offer.business.country}
							size="sm"
							showDiscountBadge={false}
						/>
					</div>
				</div>
			</a>
		{/snippet}

		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.offers as offer (offer.id)}
				{#if offer?.business?.logo}
					{@render offerCard(offer)}
				{/if}
			{/each}
		</div>
	{/if}
</div>
