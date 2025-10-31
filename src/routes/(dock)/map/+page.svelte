<!-- src/routes/(dock)/map/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import IconTimer from '~icons/fluent/timer-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconMap from '~icons/fluent/map-24-regular';
	import IconFilter from '~icons/fluent/filter-24-regular';

	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { Map, TileLayer, Marker } from 'sveaflet';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import PriceDisplay from '$lib/components/PriceDisplay.svelte';
	import OptimizedLogoImage from '$lib/components/OptimizedLogoImage.svelte';
	import { formatDistance } from '$lib/util';

	let { data }: { data: PageData } = $props();

	let currentTime = $state(new Date());
	let interval: ReturnType<typeof setInterval>;
	let selectedLocation = $state<{ name: string; lat: number; lon: number } | null>(null);
	let selectedOffer = $state<any>(null);
	let showBottomSheet = $state(false);

	// Location search state
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let isSearching = $state(false);
	let showResults = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout>;
	let selectedTypes = $state<string[]>(['all']);

	// Business type options
	const businessTypes = [
		{ value: 'all', label: 'All Types' },
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

		// Load saved location
		if (browser) {
			const saved = localStorage.getItem('userLocation');
			if (saved) {
				selectedLocation = JSON.parse(saved);
				searchQuery = selectedLocation?.name || '';
			}

			// Load saved filter types
			const savedTypes = localStorage.getItem('filterTypes');
			if (savedTypes) {
				selectedTypes = JSON.parse(savedTypes);
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
				const results = await response.json();
				searchResults = results;
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

						const location = {
							name: result.display_name,
							lat: latitude,
							lon: longitude
						};
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
		const params = new URLSearchParams($page.url.searchParams);

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

	function closeBottomSheet() {
		showBottomSheet = false;
		selectedOffer = null;
	}

	function openBottomSheet(offer: any) {
		selectedOffer = offer;
		showBottomSheet = true;
	}

	function getPickupTimeRemaining(pickupTimeUntil: string, currentTime: Date) {
		const now = currentTime;
		const todayDateStr = now.toISOString().split('T')[0];
		const pickupEndTime = new Date(`${todayDateStr}T${pickupTimeUntil}`);
		const diff = pickupEndTime.getTime() - now.getTime();
		const totalMinutes = Math.floor(diff / (1000 * 60));

		return { diff, totalMinutes };
	}

	// Get closest offers with locations
	const mapOffers = $derived(
		data.offers
			.filter((offer) => {
				return (
					offer &&
					offer.location &&
					offer.distance !== null &&
					offer.business &&
					offer.business.logo &&
					offer.business.logo.url
				);
			})
			.slice(0, 20)
	);

	// Calculate map center
	const mapCenter = $derived.by(() => {
		if (selectedLocation) {
			return [selectedLocation.lat, selectedLocation.lon];
		}
		if (mapOffers.length > 0 && mapOffers[0].location) {
			const avgLat =
				mapOffers.reduce((sum, o) => sum + (o.location?.latitude || 0), 0) / mapOffers.length;
			const avgLon =
				mapOffers.reduce((sum, o) => sum + (o.location?.longitude || 0), 0) / mapOffers.length;
			return [avgLat, avgLon];
		}
		return [51.1657, 10.4515]; // Germany center
	});

	const customMarkerHtml = (color: string) => `
		<div class="relative size-10 cursor-pointer">
			<div class="absolute top-1/2 left-1/2 size-10 rounded-full -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] border-[3px] border-white shadow-lg" style="background-color: ${color}; border-radius: 50% 50% 50% 0;"></div>
			<div class="absolute top-1/2 left-1/2 size-4 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
		</div>
	`;

	const activeFilterCount = $derived(selectedTypes.includes('all') ? 0 : selectedTypes.length);

	const timeRemaining = $derived(
		selectedOffer ? getPickupTimeRemaining(selectedOffer.pickupTimeUntil, currentTime) : null
	);
</script>

<BaseLayout title="Map View" description="Browse offers on a map" icon={IconMap}>
	<!-- Location Search & Filters -->
	<div class="mb-4 rounded-lg bg-base-200 p-4">
		<div class="flex flex-col gap-4">
			<!-- Location Search Row -->
			<div class="flex gap-3">
				<div class="relative flex-1">
					<input
						type="text"
						placeholder="Search for a location..."
						class="input-bordered input w-full"
						bind:value={searchQuery}
						oninput={searchLocation}
						onfocus={() => {
							if (searchResults.length > 0) showResults = true;
						}}
					/>
					<IconSearch
						class="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-base-content/40"
					/>

					{#if showResults && searchResults.length > 0}
						<div
							class="absolute z-[1001] mt-2 w-full overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-xl"
						>
							{#each searchResults as result}
								<button
									type="button"
									class="w-full border-b border-base-300 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-base-200"
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
					class="btn btn-square btn-primary"
					onclick={useCurrentLocation}
					title="Use current location"
				>
					<IconLocation class="size-5" />
				</button>
			</div>

			{#if selectedLocation}
				<div class="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2">
					<IconLocation class="size-4 text-success" />
					<span class="flex-1 text-sm text-base-content/80">{selectedLocation.name}</span>
					<button type="button" class="btn btn-ghost btn-xs" onclick={clearLocation}>
						Clear
					</button>
				</div>
			{/if}

			<!-- Filter Dropdown -->
			<div class="dropdown dropdown-end w-full">
				<div tabindex="0" role="button" class="btn w-full btn-outline">
					<IconFilter class="size-5" />
					Business Type
					{#if activeFilterCount > 0}
						<span class="badge badge-sm badge-primary">{activeFilterCount}</span>
					{/if}
				</div>
				<div
					tabindex="0"
					class="dropdown-content z-[1001] mt-2 w-72 rounded-lg border border-base-300 bg-base-100 p-4 shadow-xl"
				>
					<div class="mb-2 font-semibold text-base-content">Filter by Type</div>
					<div class="flex flex-wrap gap-2">
						{#each businessTypes as type}
							<button
								type="button"
								class="btn btn-sm {selectedTypes.includes(type.value)
									? 'btn-primary'
									: 'border border-base-300 btn-ghost'}"
								onclick={() => handleTypeToggle(type.value)}
							>
								{type.label}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>

	{#if mapOffers.length === 0}
		<div class="rounded-xl bg-info/5 p-6">
			<div class="flex items-center gap-3">
				<IconLocation class="size-6 text-info" />
				<span class="text-base-content/80"
					>No offers with location data available. Try adjusting your filters.</span
				>
			</div>
		</div>
	{:else if browser}
		<!-- Map View -->
		<div class="relative overflow-hidden rounded-xl border border-base-300">
			<div class="h-[calc(100vh-280px)] w-full">
				<Map
					options={{
						center: mapCenter,
						zoom: selectedLocation ? 13 : 11,
						minZoom: 1,
						maxZoom: 18
					}}
					class="h-full w-full"
				>
					<TileLayer
						url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}
						attribution={"&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"}
					/>

					<!-- User location marker -->
					{#if selectedLocation}
						<Marker
							latLng={[selectedLocation.lat, selectedLocation.lon]}
							width={40}
							height={40}
							html={customMarkerHtml('#10b981')}
						/>
					{/if}

					<!-- Business markers -->
					{#each mapOffers as offer (offer.id)}
						<Marker
							latLng={[offer.location!.latitude, offer.location!.longitude]}
							width={40}
							height={40}
							html={customMarkerHtml('#570df8')}
							onclick={() => openBottomSheet(offer)}
						/>
					{/each}
				</Map>
			</div>

			<!-- Map legend -->
			<div
				class="absolute top-4 right-4 left-4 z-[1000] flex flex-wrap items-center gap-3 rounded-lg bg-base-100 p-3 shadow-lg md:right-auto"
			>
				{#if selectedLocation}
					<div class="flex items-center gap-2">
						<div class="size-3 rounded-full bg-success"></div>
						<span class="text-sm text-base-content/80">Your Location</span>
					</div>
				{/if}
				<div class="flex items-center gap-2">
					<div class="size-3 rounded-full bg-primary"></div>
					<span class="text-sm text-base-content/80">Offers ({mapOffers.length})</span>
				</div>
			</div>
		</div>

		<!-- Bottom Sheet Modal -->
		{#if showBottomSheet && selectedOffer}
			<!-- Backdrop -->
			<button
				type="button"
				class="fixed inset-0 z-[2000] bg-black/50 transition-opacity"
				onclick={closeBottomSheet}
				aria-label="Close"
			></button>

			<!-- Bottom Sheet -->
			<div
				class="animate-slide-up fixed right-0 bottom-0 left-0 z-[2001] max-h-[80vh] overflow-y-auto rounded-t-2xl bg-base-100 shadow-2xl"
			>
				<!-- Drag Handle -->
				<div class="flex justify-center py-3">
					<div class="h-1.5 w-12 rounded-full bg-base-content/20"></div>
				</div>

				<div class="p-6">
					<!-- Close Button -->
					<button
						type="button"
						class="btn absolute top-4 right-4 btn-circle btn-ghost btn-sm"
						onclick={closeBottomSheet}
					>
						<IconDismiss class="size-5" />
					</button>

					<!-- Business Header -->
					<div class="mb-6 flex items-center gap-4">
						<OptimizedLogoImage
							src={selectedOffer.business.logo.url}
							alt={selectedOffer.business.name}
							size="md"
							shape="circle"
							priority={true}
						/>
						<div class="flex-1">
							<h2 class="text-xl font-bold text-base-content">{selectedOffer.name}</h2>
							<p class="text-sm text-base-content/60">{selectedOffer.business.name}</p>
						</div>
					</div>

					<!-- Details -->
					<div class="mb-6 space-y-3">
						<div class="flex items-center gap-3 text-base-content/80">
							<IconLocation class="size-5 text-primary" />
							<div class="flex-1">
								<div class="font-medium">{selectedOffer.location.city}</div>
								<div class="text-sm text-base-content/60">
									{selectedOffer.location.street}
								</div>
							</div>
							{#if selectedOffer.distance !== null}
								<span class="badge badge-lg badge-primary">
									{formatDistance(selectedOffer.distance)}
								</span>
							{/if}
						</div>

						<div class="flex items-center gap-3 text-base-content/80">
							<IconClock class="size-5 text-primary" />
							<span class="font-medium"
								>{selectedOffer.pickupTimeFrom.slice(0, 5)} - {selectedOffer.pickupTimeUntil.slice(
									0,
									5
								)}</span
							>
						</div>

						{#if timeRemaining && timeRemaining.diff > 0 && timeRemaining.totalMinutes <= 30}
							<div class="alert alert-error shadow-lg">
								<IconTimer class="size-5" />
								<span class="font-medium">Only {timeRemaining.totalMinutes} minutes left!</span>
							</div>
						{:else if timeRemaining && timeRemaining.diff <= 0}
							<div class="alert alert-error shadow-lg">
								<span class="font-medium">Pickup time has ended</span>
							</div>
						{/if}
					</div>

					<!-- Price -->
					<div class="mb-6">
						<PriceDisplay
							originalValue={selectedOffer.originalValue}
							price={selectedOffer.price}
							country={selectedOffer.business.country}
							paymentFeePercent={data.feePercentage}
							size="lg"
						/>
					</div>

					<!-- Action Button -->
					<a
						href="/offers/{selectedOffer.id}"
						class="btn w-full gap-2 btn-lg btn-primary"
						onclick={closeBottomSheet}
					>
						View Full Offer
						<IconArrowRight class="size-5" />
					</a>
				</div>
			</div>
		{/if}
	{/if}
</BaseLayout>

<style>
	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.animate-slide-up {
		animation: slide-up 0.3s ease-out;
	}
</style>
