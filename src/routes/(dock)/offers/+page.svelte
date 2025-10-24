<!-- src/routes/(dock)/offers/+page.svelte -->
<script lang="ts">
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconGlobe from '~icons/fluent/globe-24-regular';
	import IconMoney from '~icons/fluent/money-24-regular';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconBox from '~icons/fluent/box-24-regular';

	let { data } = $props();

	// Separate offers by location type
	const allLocationOffers = $derived(data.offers.filter((o) => o.locationId === null));
	const specificLocationOffers = $derived(data.offers.filter((o) => o.locationId !== null));
	const activeOffers = $derived(data.offers.filter((o) => o.isActive));
	const inactiveOffers = $derived(data.offers.filter((o) => !o.isActive));

	function formatTime(timeString: string | null) {
		if (!timeString) return '';
		const [hours, minutes] = timeString.split(':');
		return `${hours}:${minutes}`;
	}

	function formatDate(date: Date | null) {
		if (!date) return 'No expiry';
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<!-- Header -->
<div class="mb-8">
	<div class="mb-2 flex items-center gap-3">
		<IconTag class="size-6 text-primary" />
		<h1 class="text-2xl font-semibold">Business Offers</h1>
	</div>
	<p class="text-base-content/60">Manage your special offers and promotions</p>
</div>

{#if data.offers.length === 0}
	<!-- Empty State -->
	<div class="rounded-lg border-2 border-dashed border-base-300 bg-base-100 p-12 text-center">
		<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-base-200">
			<IconTag class="h-8 w-8 text-base-content/40" />
		</div>
		<h2 class="mb-2 text-xl font-semibold">No offers yet</h2>
		<p class="mb-6 text-base-content/60">
			Create your first offer to attract customers and boost your business
		</p>
		<a href="/offers/new" class="btn gap-2 btn-primary">
			<IconAdd class="size-5" />
			Create First Offer
		</a>
	</div>
{:else}
	<div class="mb-6 flex items-center justify-between">
		<div class="tabs-bordered tabs">
			<a class="tab-active tab">All Offers</a>
		</div>
		<a href="/offers/new" class="btn gap-2 btn-primary">
			<IconAdd class="size-5" />
			Create Offer
		</a>
	</div>

	<!-- All Locations Offers -->
	{#if allLocationOffers.length > 0}
		<div class="mb-8">
			<div class="mb-4 flex items-center gap-2">
				<IconGlobe class="size-5 text-secondary" />
				<h2 class="text-lg font-semibold">All Locations</h2>
				<span class="badge badge-sm badge-secondary">{allLocationOffers.length}</span>
			</div>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each allLocationOffers as offer}
					<div
						class="rounded-lg border-2 border-secondary/30 bg-base-100 p-5 transition-colors hover:border-secondary"
					>
						<!-- Header -->
						<div class="mb-3 flex items-start justify-between gap-2">
							<h3 class="leading-tight font-semibold">{offer.name}</h3>
							{#if offer.isActive}
								<span class="badge gap-1 badge-sm badge-success">
									<IconCheckmark class="size-3" />
									Active
								</span>
							{:else}
								<span class="badge badge-ghost badge-sm">Inactive</span>
							{/if}
						</div>

						<!-- Description -->
						<p class="mb-4 line-clamp-2 text-sm text-base-content/60">
							{offer.description}
						</p>

						<!-- Price -->
						<div class="mb-4 flex items-baseline gap-2">
							<span class="text-2xl font-bold text-success">
								{offer.price.toFixed(2)}
								{offer.currency}
							</span>
							{#if offer.originalValue}
								<span class="text-sm text-base-content/40 line-through">
									{offer.originalValue.toFixed(2)}
									{offer.currency}
								</span>
							{/if}
						</div>

						<!-- Location Badge -->
						<div class="mb-4 flex items-center gap-2 rounded-md bg-secondary/10 px-3 py-2">
							<IconGlobe class="size-4 text-secondary" />
							<span class="text-xs font-medium text-secondary">Available at all locations</span>
						</div>

						<div class="flex justify-between gap-2">
							<!-- Details -->
							<div
								class="mb-4 space-y-2 border-t border-base-300 pt-4 text-xs text-base-content/50"
							>
								{#if offer.pickupTimeFrom && offer.pickupTimeUntil}
									<div class="flex items-center gap-2">
										<IconClock class="size-4" />
										<span
											>Pickup: {formatTime(offer.pickupTimeFrom)} - {formatTime(
												offer.pickupTimeUntil
											)}</span
										>
									</div>
								{/if}
								{#if offer.validUntil}
									<div class="flex items-center gap-2">
										<IconCalendar class="size-4" />
										<span>Valid until {formatDate(offer.validUntil)}</span>
									</div>
								{/if}
								{#if offer.quantity}
									<div class="flex items-center gap-2">
										<IconBox class="size-4" />
										<span>{offer.quantity} available</span>
									</div>
								{/if}
								{#if offer.isRecurring}
									<div class="badge badge-outline badge-xs">Recurring</div>
								{/if}
							</div>

							<button class="btn gap-1 btn-outline btn-sm btn-error">
								<IconDelete class="size-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Location-Specific Offers -->
	{#if specificLocationOffers.length > 0}
		<div>
			<div class="mb-4 flex items-center gap-2">
				<IconLocation class="size-5 text-info" />
				<h2 class="text-lg font-semibold">Location-Specific Offers</h2>
				<span class="badge badge-sm badge-info">{specificLocationOffers.length}</span>
			</div>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each specificLocationOffers as offer}
					<div
						class="rounded-lg border border-base-300 bg-base-100 p-5 transition-colors hover:border-info"
					>
						<!-- Header -->
						<div class="mb-3 flex items-start justify-between gap-2">
							<h3 class="leading-tight font-semibold">{offer.name}</h3>
							{#if offer.isActive}
								<span class="badge gap-1 badge-sm badge-success">
									<IconCheckmark class="size-3" />
									Active
								</span>
							{:else}
								<span class="badge badge-ghost badge-sm">Inactive</span>
							{/if}
						</div>

						<!-- Description -->
						<p class="mb-4 line-clamp-2 text-sm text-base-content/60">
							{offer.description}
						</p>

						<!-- Price -->
						<div class="mb-4 flex items-baseline gap-2">
							<span class="text-2xl font-bold text-success">
								{offer.price.toFixed(2)}
								{offer.currency}
							</span>
							{#if offer.originalValue}
								<span class="text-sm text-base-content/40 line-through">
									{offer.originalValue.toFixed(2)}
									{offer.currency}
								</span>
							{/if}
						</div>

						<!-- Location Info -->
						<div class="mb-4 rounded-md border border-info/30 bg-info/10 px-3 py-2">
							<div class="flex items-start gap-2">
								<IconLocation class="mt-0.5 size-4 shrink-0 text-info" />
								<div class="min-w-0 text-xs">
									<div class="font-semibold text-info">{offer.locationName}</div>
									<div class="text-base-content/60">
										{offer.locationCity}{#if offer.locationProvince}, {offer.locationProvince}{/if}
									</div>
								</div>
							</div>
						</div>

						<!-- Details -->
						<div class="mb-4 space-y-2 border-t border-base-300 pt-4 text-xs text-base-content/50">
							{#if offer.pickupTimeFrom && offer.pickupTimeUntil}
								<div class="flex items-center gap-2">
									<IconClock class="size-4" />
									<span
										>Pickup: {formatTime(offer.pickupTimeFrom)} - {formatTime(
											offer.pickupTimeUntil
										)}</span
									>
								</div>
							{/if}
							{#if offer.validUntil}
								<div class="flex items-center gap-2">
									<IconCalendar class="size-4" />
									<span>Valid until {formatDate(offer.validUntil)}</span>
								</div>
							{/if}
							{#if offer.quantity}
								<div class="flex items-center gap-2">
									<IconBox class="size-4" />
									<span>{offer.quantity} available</span>
								</div>
							{/if}
							{#if offer.isRecurring}
								<div class="badge badge-outline badge-xs">Recurring</div>
							{/if}
						</div>

						<!-- Actions -->
						<div class="flex gap-2">
							<!-- todo: also make sure that an offer can only deleted if it's not reserved. also fix this on the server side -->
							<button class="btn gap-1 btn-outline btn-sm btn-error">
								<IconDelete class="size-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
{/if}
