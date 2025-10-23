<!-- src/routes/(dock)/discover/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import IconFluentCalendar24Regular from '~icons/fluent/calendar-24-regular';
	import IconFluentTag24Regular from '~icons/fluent/tag-24-regular';
	import IconFluentTimer24Regular from '~icons/fluent/timer-24-regular';
	import IconFluentLocation24Regular from '~icons/fluent/location-24-regular';
	import IconFluentSearch24Regular from '~icons/fluent/search-24-regular';
	import IconFluentNavigation24Regular from '~icons/fluent/navigation-24-regular';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	let currentTime = $state(new Date());
	let interval: ReturnType<typeof setInterval>;

	// Location search state
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let isSearching = $state(false);
	let showResults = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout>;
	let selectedLocation = $state<{ name: string; lat: number; lon: number } | null>(null);
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

		// Load saved location from localStorage
		const saved = localStorage.getItem('userLocation');
		if (saved) {
			selectedLocation = JSON.parse(saved);
		}

		// Load saved filter types
		const savedTypes = localStorage.getItem('filterTypes');
		if (savedTypes) {
			selectedTypes = JSON.parse(savedTypes);
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
		localStorage.setItem('userLocation', JSON.stringify(location));
		searchQuery = result.display_name;
		showResults = false;

		updateUrl();
	}

	function useCurrentLocation() {
		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				async (position) => {
					const { latitude, longitude } = position.coords;

					// Reverse geocode to get address
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
						localStorage.setItem('userLocation', JSON.stringify(location));
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
		localStorage.removeItem('userLocation');
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

		// Handle multiple types
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
			// Remove 'all' if present
			const filtered = selectedTypes.filter((t) => t !== 'all');

			// Toggle the type
			if (filtered.includes(type)) {
				const newTypes = filtered.filter((t) => t !== type);
				selectedTypes = newTypes.length === 0 ? ['all'] : newTypes;
			} else {
				selectedTypes = [...filtered, type];
			}
		}

		localStorage.setItem('filterTypes', JSON.stringify(selectedTypes));
		updateUrl();
	}

	function getTimeRemaining(validUntil: Date | null) {
		if (!validUntil) return null;

		const end = new Date(validUntil);
		const now = currentTime;
		const diff = end.getTime() - now.getTime();

		if (diff <= 0) return { expired: true };

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((diff % (1000 * 60)) / 1000);

		return { expired: false, days, hours, minutes, seconds };
	}

	function formatCountdown(timeRemaining: ReturnType<typeof getTimeRemaining>) {
		if (!timeRemaining) return null;
		if (timeRemaining.expired) return 'Expired';

		const { days, hours, minutes, seconds } = timeRemaining;

		if (days > 0) {
			return `${days}d ${hours}h`;
		} else if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds}s`;
		} else {
			return `${seconds}s`;
		}
	}

	function formatPrice(price: number, currency: string) {
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: currency
		}).format(price);
	}

	function formatDistance(distance: number | null) {
		if (distance === null) return null;
		if (distance < 1) {
			return `${Math.round(distance * 1000)}m`;
		}
		return `${distance.toFixed(1)}km`;
	}

	function getLogoUrl(key: string) {
		return `/api/files/${key}`;
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="mb-2 text-4xl font-bold">Discover Offers</h1>
		<p class="text-base-content/70">Find great deals from businesses near you</p>
	</div>

	<!-- Location Search -->
	<div class="card mb-6 bg-base-100 shadow-lg">
		<div class="card-body">
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-4 md:flex-row">
					<div class="relative flex-1">
						<label class="label">
							<span class="label-text font-semibold">Location</span>
						</label>
						<div class="flex gap-2">
							<div class="relative flex-1">
								<input
									type="text"
									placeholder="Search for a location..."
									class="input-bordered input w-full pr-10"
									bind:value={searchQuery}
									oninput={searchLocation}
									onfocus={() => {
										if (searchResults.length > 0) showResults = true;
									}}
								/>
								<IconFluentSearch24Regular
									class="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-base-content/50"
								/>

								{#if showResults && searchResults.length > 0}
									<div
										class="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-lg border border-base-300 bg-base-100 shadow-xl"
									>
										{#each searchResults as result}
											<button
												type="button"
												class="w-full border-b border-base-300 px-4 py-3 text-left last:border-b-0 hover:bg-base-200"
												onclick={() => selectLocation(result)}
											>
												<div class="flex items-start gap-2">
													<IconFluentLocation24Regular
														class="mt-0.5 size-5 shrink-0 text-primary"
													/>
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
								<IconFluentNavigation24Regular class="size-5" />
							</button>
						</div>

						{#if selectedLocation}
							<div class="mt-2 flex items-center gap-2">
								<IconFluentLocation24Regular class="h-4 w-4 text-success" />
								<span class="text-sm text-base-content/70">{selectedLocation.name}</span>
								<button type="button" class="btn btn-ghost btn-xs" onclick={clearLocation}>
									Clear
								</button>
							</div>
						{/if}
					</div>
				</div>

				<div class="flex-1">
					<label class="label">
						<span class="label-text font-semibold">Business Type</span>
					</label>
					<div class="flex flex-wrap gap-2">
						{#each businessTypes as type}
							<button
								type="button"
								class="btn btn-sm {selectedTypes.includes(type.value)
									? 'btn-primary'
									: 'btn-outline'}"
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

	<!-- Offers Grid -->
	{#if data.offers.length === 0}
		<div class="alert alert-info">
			<IconFluentTag24Regular class="h-6 w-6" />
			<span>No offers available at the moment. Check back soon!</span>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each data.offers as offer (offer.id)}
				<a
					href="/offers/{offer.id}"
					class="card bg-base-100 shadow-xl transition-shadow hover:shadow-2xl"
				>
					<figure class="px-6 pt-6">
						<div class="avatar">
							<div
								class="h-24 w-24 rounded-full ring ring-primary ring-offset-2 ring-offset-base-100"
							>
								<img
									src={getLogoUrl(offer.business.logo.key)}
									alt={offer.business.name}
									class="object-cover"
								/>
							</div>
						</div>
					</figure>

					<div class="card-body">
						<h2 class="card-title text-lg">{offer.name}</h2>

						<div class="mb-2 flex items-center gap-2 text-sm text-base-content/70">
							<IconFluentTag24Regular class="h-4 w-4" />
							<span class="truncate">{offer.business.name}</span>
						</div>

						{#if offer.location}
							<div class="mb-2 flex items-center gap-2 text-sm text-base-content/70">
								<IconFluentLocation24Regular class="h-4 w-4" />
								<span class="truncate">{offer.location.city}</span>
								{#if offer.distance !== null}
									<span class="badge badge-outline badge-sm">
										{formatDistance(offer.distance)}
									</span>
								{/if}
							</div>
						{/if}

						<p class="mb-3 line-clamp-2 text-sm text-base-content/70">
							{offer.description}
						</p>

						<div class="mb-3 flex flex-wrap gap-2">
							{#if offer.isRecurring}
								<div class="badge badge-sm badge-secondary">
									<IconFluentCalendar24Regular class="mr-1 h-3 w-3" />
									Recurring
								</div>
							{/if}

							{#if offer.validUntil}
								{@const timeRemaining = getTimeRemaining(offer.validUntil)}
								{#if timeRemaining?.expired}
									<div class="badge badge-sm badge-error">Expired</div>
								{:else if timeRemaining}
									<div class="badge badge-sm badge-warning">
										<IconFluentTimer24Regular class="mr-1 h-3 w-3" />
										{formatCountdown(timeRemaining)}
									</div>
								{/if}
							{/if}
						</div>

						<div
							class="mt-auto card-actions items-center justify-between border-t border-base-300 pt-4"
						>
							<div class="flex items-center gap-1">
								<IconFluentTag24Regular class="size-5 text-primary" />
								<span class="text-2xl font-bold text-primary">
									{formatPrice(offer.price, offer.currency)}
								</span>
							</div>

							<button class="btn btn-sm btn-primary"> View Details </button>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
