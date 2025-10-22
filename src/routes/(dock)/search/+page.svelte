<!-- src/routes/(dock)/search/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import IconFluentCalendar24Regular from '~icons/fluent/calendar-24-regular';
	import IconFluentTag24Regular from '~icons/fluent/tag-24-regular';
	import IconFluentTimer24Regular from '~icons/fluent/timer-24-regular';
	import { onMount, onDestroy } from 'svelte';

	let { data }: { data: PageData } = $props();

	let currentTime = $state(new Date());
	let interval: ReturnType<typeof setInterval>;

	onMount(() => {
		// Update time every second for countdown
		interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

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

	function formatDate(date: string | null) {
		if (!date) return null;
		return new Intl.DateTimeFormat('de-DE', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(new Date(date));
	}

	function getLogoUrl(key: string) {
		return `/api/files/${key}`;
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="mb-2 text-4xl font-bold">All Offers</h1>
		<p class="text-base-content/70">Discover great deals from businesses near you</p>
	</div>

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
								<IconFluentTag24Regular class="h-5 w-5 text-primary" />
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
