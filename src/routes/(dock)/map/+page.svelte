<!-- src/routes/(dock)/map/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import IconFluentTimer24Regular from '~icons/fluent/timer-24-regular';
	import IconFluentLocation24Regular from '~icons/fluent/location-24-regular';
	import IconFluentClock24Regular from '~icons/fluent/clock-24-regular';
	import IconFluentArrowRight24Regular from '~icons/fluent/arrow-right-24-regular';
	import IconFluentDismiss24Regular from '~icons/fluent/dismiss-24-regular';
	import IconFluentMap24Regular from '~icons/fluent/map-24-regular';

	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { Map, TileLayer, Marker, Popup } from 'sveaflet';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import PriceDisplay from '$lib/components/PriceDisplay.svelte';
	import { formatDistance } from '$lib/util';

	let { data }: { data: PageData } = $props();

	let currentTime = $state(new Date());
	let interval: ReturnType<typeof setInterval>;
	let selectedLocation = $state<{ name: string; lat: number; lon: number } | null>(null);
	let selectedOffer = $state<any>(null);
	let showBottomSheet = $state(false);

	onMount(() => {
		interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		// Load saved location
		if (browser) {
			const saved = localStorage.getItem('userLocation');
			if (saved) {
				selectedLocation = JSON.parse(saved);
			}
		}
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

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

	// Get closest 10 offers with locations
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

	const timeRemaining = $derived(
		getPickupTimeRemaining(selectedOffer.pickupTimeUntil, currentTime)
	);
</script>

<BaseLayout title="Map View" description="Browse offers on a map" icon={IconFluentMap24Regular}>
	{#if mapOffers.length === 0}
		<div class="rounded-xl bg-info/5 p-6">
			<div class="flex items-center gap-3">
				<IconFluentLocation24Regular class="size-6 text-info" />
				<span class="text-base-content/80"
					>No offers with location data available. Try adjusting your filters.</span
				>
			</div>
		</div>
	{:else if browser}
		<!-- Map View -->
		<div class="relative overflow-hidden rounded-xl border border-base-300">
			<div class="h-[calc(100vh-200px)] w-full">
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
						<IconFluentDismiss24Regular class="size-5" />
					</button>

					<!-- Business Header -->
					<div class="mb-6 flex items-center gap-4">
						<img
							src={selectedOffer.business.logo.url}
							alt={selectedOffer.business.name}
							class="size-16 rounded-full object-cover"
						/>
						<div class="flex-1">
							<h2 class="text-xl font-bold text-base-content">{selectedOffer.name}</h2>
							<p class="text-sm text-base-content/60">{selectedOffer.business.name}</p>
						</div>
					</div>

					<!-- Details -->
					<div class="mb-6 space-y-3">
						<div class="flex items-center gap-3 text-base-content/80">
							<IconFluentLocation24Regular class="size-5 text-primary" />
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
							<IconFluentClock24Regular class="size-5 text-primary" />
							<span class="font-medium"
								>{selectedOffer.pickupTimeFrom.slice(0, 5)} - {selectedOffer.pickupTimeUntil.slice(
									0,
									5
								)}</span
							>
						</div>

						{#if timeRemaining.diff > 0 && timeRemaining.totalMinutes <= 30}
							<div class="alert alert-error shadow-lg">
								<IconFluentTimer24Regular class="size-5" />
								<span class="font-medium">Only {timeRemaining.totalMinutes} minutes left!</span>
							</div>
						{:else if timeRemaining.diff <= 0}
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
							paymentFeePercent={5}
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
						<IconFluentArrowRight24Regular class="size-5" />
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
