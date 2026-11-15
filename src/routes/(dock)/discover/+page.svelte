<!-- src/routes/(dock)/discover/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import IconSearch from '~icons/fluent/search-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconLocation from '~icons/fluent/location-24-filled';
	import IconChevronDown from '~icons/fluent/chevron-down-24-regular';
	import IconMap from '~icons/fluent/map-24-regular';
	import IconSparkle from '~icons/fluent/sparkle-24-filled';
	import IconBag from '~icons/fluent/shopping-bag-24-regular';

	import OfferCard from '#lib/components/offers/OfferCard.svelte';
	import FavoriteButton from '#lib/components/offers/FavoriteButton.svelte';
	import {
		ALL_TYPES,
		BUSINESS_TYPES,
		businessTypeLabel,
		discountPercent,
		pickupWindow
	} from '#lib/components/offers/format.js';
	import LocationPicker from '#lib/components/maps/LocationPicker.svelte';
	import {
		readSavedLocation,
		saveLocation,
		shortPlaceName,
		type UserLocation
	} from '#lib/components/maps/userLocation.js';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatDistance } from '#lib/util.js';

	let { data }: { data: PageData } = $props();

	type Offer = PageData['offers'][number];

	const FILTER_KEY = 'filterTypes';
	const knownTypes = new Set(BUSINESS_TYPES.map((type) => type.value));

	function typesFromUrl(): string[] {
		const fromUrl = page.url.searchParams.get('types');
		return fromUrl ? fromUrl.split(',').filter((type) => knownTypes.has(type)) : [];
	}

	let now = $state(new Date());
	let userLocation = $state<UserLocation | null>(null);
	let pickerOpen = $state(false);
	let query = $state('');
	let selectedTypes = $state<string[]>(typesFromUrl());
	let favoriteOverrides = $state<Record<string, boolean>>({});

	onMount(() => {
		now = new Date();
		const clock = setInterval(() => (now = new Date()), 60_000);

		if (selectedTypes.length === 0) {
			try {
				const saved = JSON.parse(localStorage.getItem(FILTER_KEY) ?? '[]');
				if (Array.isArray(saved)) {
					selectedTypes = saved.filter((type) => type !== ALL_TYPES && knownTypes.has(type));
				}
			} catch {
				// A broken saved filter just means "show everything".
			}
		}

		userLocation = readSavedLocation();
		const lat = Number(page.url.searchParams.get('lat'));
		const lon = Number(page.url.searchParams.get('lon'));
		if (data.hasOrigin) {
			// A shared link wins over the saved place, but keep a readable name for it.
			if (!userLocation || userLocation.lat !== lat || userLocation.lon !== lon) {
				userLocation = { name: 'Selected place', lat, lon };
			}
		} else if (userLocation) {
			applyLocation(userLocation);
		}

		return () => clearInterval(clock);
	});

	function locationParams(location: UserLocation | null): string {
		const params = new URLSearchParams();
		if (location) {
			params.set('lat', String(location.lat));
			params.set('lon', String(location.lon));
		}
		const text = params.toString();
		return text ? `?${text}` : '';
	}

	function applyLocation(location: UserLocation | null) {
		userLocation = location;
		saveLocation(location);
		// Only the distance ranking needs the server; the page stays put meanwhile.
		goto(`/discover${locationParams(location)}`, { replace: true, reset: false });
	}

	function toggleType(type: string) {
		if (type === ALL_TYPES) selectedTypes = [];
		else if (selectedTypes.includes(type)) selectedTypes = selectedTypes.filter((t) => t !== type);
		else selectedTypes = [...selectedTypes, type];

		try {
			localStorage.setItem(FILTER_KEY, JSON.stringify(selectedTypes));
		} catch {
			// Not being able to remember the filter is harmless.
		}
	}

	function clearFilters() {
		query = '';
		if (selectedTypes.length > 0) toggleType(ALL_TYPES);
	}

	const greeting = $derived.by(() => {
		const hour = now.getHours();
		if (hour < 5) return 'Good night';
		if (hour < 12) return 'Good morning';
		if (hour < 18) return 'Good afternoon';
		return 'Good evening';
	});

	// Only offer categories that exist right now, so no chip leads to an empty list.
	const typeOptions = $derived.by(() => {
		const present = new Set<string>(data.offers.map((offer) => offer.business.type));
		return BUSINESS_TYPES.filter(
			(type) =>
				type.value === ALL_TYPES || present.has(type.value) || selectedTypes.includes(type.value)
		);
	});

	const filtered = $derived.by(() => {
		const term = query.trim().toLowerCase();
		return data.offers.filter((offer) => {
			if (selectedTypes.length > 0 && !selectedTypes.includes(offer.business.type)) return false;
			if (!term) return true;
			return (
				offer.name.toLowerCase().includes(term) ||
				offer.business.name.toLowerCase().includes(term) ||
				(offer.location?.city.toLowerCase().includes(term) ?? false) ||
				businessTypeLabel(offer.business.type).toLowerCase().includes(term)
			);
		});
	});

	const isFiltering = $derived(query.trim().length > 0 || selectedTypes.length > 0);

	// Highlights come from the whole catalogue (nearest first when a place is
	// set), so a category filter never hides the best deals.
	const highlights = $derived.by(() => {
		const pool = data.offers
			.filter((offer) => offer.available > 0 && !pickupWindow(offer, now).ended)
			.slice(0, 30);
		const picks: { label: string; offer: Offer }[] = [];
		const add = (label: string, offer: Offer | undefined) => {
			if (offer && !picks.some((pick) => pick.offer.id === offer.id)) picks.push({ label, offer });
		};
		const discountOf = (offer: Offer) => discountPercent(offer.originalValue, offer.price);

		add('Biggest discount', [...pool].sort((a, b) => discountOf(b) - discountOf(a))[0]);
		add(
			'Almost gone',
			pool.filter((offer) => offer.available <= 3).sort((a, b) => a.available - b.available)[0]
		);
		add('Lowest price', [...pool].sort((a, b) => a.price - b.price)[0]);
		add(
			'Closing soon',
			pool
				.map((offer) => ({ offer, left: pickupWindow(offer, now).minutesLeft }))
				.filter((entry) => entry.left !== null && entry.left <= 90)
				.sort((a, b) => (a.left ?? 0) - (b.left ?? 0))[0]?.offer
		);
		return picks;
	});

	const places = $derived.by(() => {
		const byId = new Map<
			string,
			{
				id: string;
				name: string;
				businessName: string;
				city: string;
				imageUrl: string | null;
				logoUrl: string | null;
				distance: number | null;
				offerCount: number;
			}
		>();
		for (const offer of filtered) {
			if (!offer.location) continue;
			const existing = byId.get(offer.location.id);
			if (existing) existing.offerCount += 1;
			else
				byId.set(offer.location.id, {
					id: offer.location.id,
					name: offer.location.name,
					businessName: offer.business.name,
					city: offer.location.city,
					imageUrl: offer.location.imageUrl,
					logoUrl: offer.business.logoUrl,
					distance: offer.distance,
					offerCount: 1
				});
		}
		return [...byId.values()];
	});

	const isFavorite = (id: string) =>
		favoriteOverrides[id] ?? data.favoriteLocationIds.includes(id);
</script>

<svelte:head>
	<title>Discover · GoBento</title>
</svelte:head>

<div class="page">
	<header class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<p class="eyebrow">{greeting}</p>
			<h1 class="mt-1 text-[1.7rem] leading-tight font-extrabold tracking-tight sm:text-4xl">
				Rescue something <span class="text-primary">tasty</span>
			</h1>
		</div>
		<Button
			href="/map{locationParams(userLocation)}"
			variant="plain"
			shape="circle"
			class="surface shrink-0 text-primary"
			aria-label="Show offers on the map"
		>
			<IconMap class="size-5" />
		</Button>
	</header>

	<button
		type="button"
		class="mt-3 flex min-h-11 max-w-full items-center gap-1.5 rounded-full py-1 pe-2 text-start font-bold transition-colors hover:text-primary"
		onclick={() => (pickerOpen = true)}
	>
		<IconLocation class="size-5 shrink-0 text-primary" />
		<span class="truncate">
			{userLocation ? shortPlaceName(userLocation.name) : 'Set your location'}
		</span>
		<IconChevronDown class="size-4 shrink-0 text-base-content/50" />
	</button>

	<!-- Search + categories stay reachable while scrolling. -->
	<div
		class="sticky top-0 z-20 -mx-4 bg-base-200/85 px-4 pt-2 pb-1 backdrop-blur-lg sm:-mx-6 sm:px-6"
	>
		<label class="input w-full rounded-full border-base-300/70 shadow-soft">
			<IconSearch class="size-5 text-base-content/50" />
			<input
				type="search"
				placeholder="Search food or shops"
				aria-label="Search offers"
				autocomplete="off"
				enterkeyhint="search"
				bind:value={query}
			/>
			{#if query}
				<button
					type="button"
					class="-me-1 flex size-8 items-center justify-center rounded-full text-base-content/60 hover:bg-base-200"
					aria-label="Clear search"
					onclick={() => (query = '')}
				>
					<IconDismiss class="size-4" />
				</button>
			{/if}
		</label>

		<div class="rail mt-3 gap-2" role="group" aria-label="Filter by category">
			{#each typeOptions as type (type.value)}
				{@const active =
					type.value === ALL_TYPES ? selectedTypes.length === 0 : selectedTypes.includes(type.value)}
				<button
					type="button"
					aria-pressed={active}
					class="flex h-11 items-center gap-2 rounded-full border ps-2.5 pe-4 text-sm font-bold transition-[background-color,border-color,color,transform] duration-200 ease-spring active:scale-95 {active
						? 'border-primary bg-primary text-primary-content shadow-glow'
						: 'border-base-300/70 bg-base-100 text-base-content/75 hover:border-primary/40'}"
					onclick={() => toggleType(type.value)}
				>
					<span
						class="flex size-7 items-center justify-center rounded-full {active
							? 'bg-primary-content/20'
							: 'bg-base-200'}"
					>
						<type.icon class="size-4.5" />
					</span>
					{type.label}
				</button>
			{/each}
		</div>
	</div>

	{#if data.offers.length === 0}
		<EmptyState
			class="mt-6"
			icon={IconBag}
			title="Nothing to rescue right now"
			description="Shops post their surplus throughout the day. Check back a little later."
		/>
	{:else}
		{#if highlights.length > 1 && !query.trim()}
			<section class="mt-5" aria-labelledby="highlights-title">
				<h2 id="highlights-title" class="mb-3 flex items-center gap-2 text-lg font-extrabold">
					<IconSparkle class="size-5 text-secondary" />
					{data.hasOrigin ? 'Top picks near you' : 'Top picks today'}
				</h2>
				<div class="rail">
					{#each highlights as pick, index (pick.offer.id)}
						<OfferCard
							offer={pick.offer}
							business={pick.offer.business}
							country={pick.offer.business.country}
							highlight={pick.label}
							{index}
							{now}
							priority={index < 2}
							class="w-[17.5rem]"
						/>
					{/each}
				</div>
			</section>
		{/if}

		{#if places.length > 1}
			<section class="mt-6" aria-labelledby="places-title">
				<h2 id="places-title" class="mb-3 text-lg font-extrabold">
					{data.hasOrigin ? 'Shops around you' : 'Shops taking part'}
				</h2>
				<div class="rail">
					{#each places as place, index (place.id)}
						<div
							class="surface pressable stagger relative w-44 animate-rise-in overflow-hidden hover:border-primary/30"
							style:--i={Math.min(index, 8)}
							animate:flip={{ duration: 300 }}
						>
							<a href="/locations/{place.id}" class="block">
								<div class="aspect-[4/3] bg-base-200">
									{#if place.imageUrl}
										<img
											src={place.imageUrl}
											alt=""
											loading="lazy"
											decoding="async"
											class="size-full object-cover"
										/>
									{/if}
								</div>
								<div class="relative px-3 pt-5 pb-3">
									{#if place.logoUrl}
										<img
											src={place.logoUrl}
											alt=""
											loading="lazy"
											decoding="async"
											class="absolute -top-5 start-3 size-9 rounded-xl border-2 border-base-100 bg-base-100 object-cover shadow-soft"
										/>
									{/if}
									<p class="truncate text-sm font-extrabold">{place.businessName}</p>
									<p class="tabular truncate text-xs text-base-content/60">
										{place.offerCount}
										{place.offerCount === 1 ? 'offer' : 'offers'}
										· {place.distance !== null ? formatDistance(place.distance) : place.city}
									</p>
								</div>
							</a>
							{#if data.canFavorite}
								<FavoriteButton
									locationId={place.id}
									name={place.businessName}
									size="sm"
									class="absolute end-2 top-2"
									bind:favorite={
										() => isFavorite(place.id), (value) => (favoriteOverrides[place.id] = value)
									}
								/>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<section class="mt-6" aria-labelledby="offers-title">
			<div class="mb-3 flex items-baseline justify-between gap-3">
				<h2 id="offers-title" class="text-lg font-extrabold">
					{isFiltering ? 'Matching offers' : data.hasOrigin ? 'Closest to you' : 'All offers'}
				</h2>
				<p class="tabular text-sm font-semibold text-base-content/60" aria-live="polite">
					{filtered.length}
					{filtered.length === 1 ? 'offer' : 'offers'}
				</p>
			</div>

			{#if filtered.length === 0}
				<EmptyState
					icon={IconSearch}
					size="sm"
					title="No offers match"
					description="Try another category or a broader search."
				>
					{#snippet actions()}
						<Button variant="primary" outline onclick={clearFilters}>Clear filters</Button>
					{/snippet}
				</EmptyState>
			{:else}
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each filtered as offer, index (offer.id)}
						<div class="flex" animate:flip={{ duration: 320 }}>
							<OfferCard
								{offer}
								business={offer.business}
								country={offer.business.country}
								{index}
								{now}
								class="w-full"
							/>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<LocationPicker bind:open={pickerOpen} current={userLocation} onselect={applyLocation} />
