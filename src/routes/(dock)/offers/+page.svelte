<!-- src/routes/(dock)/offers/+page.svelte -->
<script lang="ts">
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconGlobe from '~icons/fluent/globe-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconBox from '~icons/fluent/box-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';
	import IconWarning from '~icons/fluent/warning-24-regular';
	import IconPeople from '~icons/fluent/people-24-regular';
	import IconFilterDismiss from '~icons/fluent/filter-dismiss-24-regular';

	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import { formatDate, formatTime } from '$lib/util';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import NotFound from '$lib/components/NotFound.svelte';
	import OptimizedLocationImage from '$lib/components/images/OptimizedLocationImage.svelte';
	import { useImagePreloader, extractImageUrls } from '$lib/utils/imagePreloader.svelte';

	let { data } = $props();

	// Preload offer images for a snappier experience
	useImagePreloader(() => extractImageUrls(data.offers));

	type Offer = (typeof data.offers)[number];

	// Separate offers by location type
	const allLocationOffers = $derived(data.offers.filter((o) => o.locationId === null));
	const specificLocationOffers = $derived(data.offers.filter((o) => o.locationId !== null));

	// Whether any filter deviates from the default view
	const hasActiveFilters = $derived(
		data.filters.status !== 'all' ||
			data.filters.recurring !== 'all' ||
			data.filters.sort !== 'newest' ||
			data.filters.minAmount !== null ||
			data.filters.maxAmount !== null
	);

	// Update a single filter and reflect it in the URL (server re-runs the query)
	function updateFilter(key: string, value: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (value === '' || value === 'all' || (key === 'sort' && value === 'newest')) {
			params.delete(key);
		} else {
			params.set(key, value);
		}
		goto(`?${params.toString()}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function clearFilters() {
		goto('?', { replaceState: true, keepFocus: true, noScroll: true });
	}

	// Delete modal state
	let offerToDelete = $state<Offer | null>(null);
	let showDeleteModal = $state(false);
	let deleting = $state(false);

	function requestDelete(offer: Offer) {
		offerToDelete = offer;
		showDeleteModal = true;
	}

	// Clear the selected offer once the modal is fully closed
	$effect(() => {
		if (!showDeleteModal) {
			offerToDelete = null;
		}
	});
</script>

{#snippet offerCard(offer: Offer)}
	<div
		class="group flex flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg {offer.isActive
			? ''
			: 'opacity-70'}"
	>
		<!-- Image header -->
		<div class="relative h-44 w-full overflow-hidden">
			<OptimizedLocationImage
				src={offer.imageUrl ?? ''}
				alt={offer.name}
				class="h-full w-full transition-transform duration-300 group-hover:scale-105"
			/>
			<div class="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent"></div>

			<!-- Status badge -->
			<div class="absolute top-3 left-3">
				{#if offer.isActive}
					<span class="badge gap-1 border-none badge-sm badge-success shadow">
						<IconCheckmark class="size-3" />
						{#if offer.validUntil}
							Active until {formatDate(offer.validUntil)}
						{:else}
							Active
						{/if}
					</span>
				{:else}
					<span class="badge border-none badge-sm badge-neutral shadow">Inactive</span>
				{/if}
			</div>

			<!-- Reserved badge -->
			{#if offer.reservedCount > 0}
				<div class="absolute top-3 right-3">
					<span class="badge gap-1 border-none badge-sm badge-warning shadow">
						<IconPeople class="size-3" />
						{offer.reservedCount} reserved
					</span>
				</div>
			{/if}
		</div>

		<!-- Body -->
		<div class="flex flex-1 flex-col p-5">
			<h3 class="leading-tight font-semibold">{offer.name}</h3>
			<p class="mt-1 line-clamp-2 text-sm text-base-content/60">{offer.description}</p>

			<!-- Price -->
			<div class="mt-4 flex items-baseline gap-2">
				<span class="text-2xl font-bold text-success">
					{offer.price.toFixed(2)}
					{offer.currency}
				</span>
				{#if offer.originalValue && offer.originalValue > offer.price}
					<span class="text-sm text-base-content/40 line-through">
						{offer.originalValue.toFixed(2)}
						{offer.currency}
					</span>
				{/if}
			</div>

			<!-- Location -->
			{#if offer.locationId !== null}
				<a
					href="/locations/{offer.locationId}"
					class="mt-4 flex items-start gap-2 rounded-lg border border-info/20 bg-info/5 px-3 py-2 transition-colors hover:bg-info/10"
				>
					<IconLocation class="mt-0.5 size-4 shrink-0 text-info" />
					<div class="min-w-0 text-xs">
						<div class="truncate font-semibold text-info">{offer.locationName}</div>
						<div class="text-base-content/60">
							{offer.locationCity}{#if offer.locationProvince}, {offer.locationProvince}{/if}
						</div>
					</div>
				</a>
			{/if}

			<!-- Details -->
			<div class="mt-4 grid grid-cols-1 gap-2 text-xs text-base-content/60">
				{#if offer.pickupTimeFrom && offer.pickupTimeUntil}
					<div class="flex items-center gap-2">
						<IconClock class="size-4 shrink-0 text-base-content/40" />
						<span
							>Pickup {formatTime(offer.pickupTimeFrom)} – {formatTime(offer.pickupTimeUntil)}</span
						>
					</div>
				{/if}
				{#if offer.quantity}
					<div class="flex items-center gap-2">
						<IconBox class="size-4 shrink-0 text-base-content/40" />
						<span>{offer.quantity} available</span>
					</div>
				{/if}
				{#if offer.isRecurring}
					<div class="flex items-center gap-2">
						<IconRepeat class="size-4 shrink-0 text-base-content/40" />
						<span>Recurring offer</span>
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="mt-5 flex items-center gap-2 border-t border-base-200 pt-4">
				<a href="/offers/{offer.id}" class="btn flex-1 gap-1 btn-outline btn-sm btn-primary">
					View details
					<IconArrowRight class="size-4" />
				</a>
				<button
					class="btn btn-square btn-outline btn-sm btn-error"
					aria-label="Delete offer"
					onclick={() => requestDelete(offer)}
				>
					<IconDelete class="size-4" />
				</button>
			</div>
		</div>
	</div>
{/snippet}

<BaseLayout
	title="Business Offers"
	description="Manage your special offers and promotions"
	icon={IconTag}
>
	{#if data.stats.total === 0}
		<NotFound
			icon={IconTag}
			title="No offers yet"
			description="Create your first offer to attract customers and boost your business"
			actionLabel="Create First Offer"
			actionHref="/offers/new"
			actionIcon={IconAdd}
		/>
	{:else}
		<!-- Summary bar -->
		<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex flex-wrap gap-3">
				<div class="rounded-xl border border-base-300 bg-base-100 px-4 py-2">
					<div class="text-xs text-base-content/50">Total offers</div>
					<div class="text-xl font-bold">{data.stats.total}</div>
				</div>
				<div class="rounded-xl border border-base-300 bg-base-100 px-4 py-2">
					<div class="text-xs text-base-content/50">Active</div>
					<div class="text-xl font-bold text-success">{data.stats.active}</div>
				</div>
				<div class="rounded-xl border border-base-300 bg-base-100 px-4 py-2">
					<div class="text-xs text-base-content/50">All locations</div>
					<div class="text-xl font-bold text-secondary">{data.stats.allLocations}</div>
				</div>
			</div>
			<a href="/offers/new" class="btn gap-2 btn-primary">
				<IconAdd class="size-5" />
				Create Offer
			</a>
		</div>

		<!-- Filter bar -->
		<div class="mb-8 rounded-2xl border border-base-300 bg-base-100 p-4">
			<div class="flex flex-wrap items-end gap-4">
				<!-- Status -->
				<label class="form-control">
					<span class="label-text mb-1 text-xs text-base-content/60">Status</span>
					<select
						class="select-bordered select select-sm"
						value={data.filters.status}
						onchange={(e) => updateFilter('status', e.currentTarget.value)}
					>
						<option value="all">All</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</label>

				<!-- Recurring -->
				<label class="form-control">
					<span class="label-text mb-1 text-xs text-base-content/60">Type</span>
					<select
						class="select-bordered select select-sm"
						value={data.filters.recurring}
						onchange={(e) => updateFilter('recurring', e.currentTarget.value)}
					>
						<option value="all">All</option>
						<option value="recurring">Recurring</option>
						<option value="onetime">One-time</option>
					</select>
				</label>

				<!-- Sort by price -->
				<label class="form-control">
					<span class="label-text mb-1 text-xs text-base-content/60">Sort by</span>
					<select
						class="select-bordered select select-sm"
						value={data.filters.sort}
						onchange={(e) => updateFilter('sort', e.currentTarget.value)}
					>
						<option value="newest">Newest</option>
						<option value="price_asc">Price: low to high</option>
						<option value="price_desc">Price: high to low</option>
					</select>
				</label>

				<!-- Amount range -->
				<label class="form-control">
					<span class="label-text mb-1 text-xs text-base-content/60">Min amount</span>
					<input
						type="number"
						min="0"
						placeholder="0"
						class="input-bordered input input-sm w-24"
						value={data.filters.minAmount ?? ''}
						onchange={(e) => updateFilter('minAmount', e.currentTarget.value)}
					/>
				</label>
				<label class="form-control">
					<span class="label-text mb-1 text-xs text-base-content/60">Max amount</span>
					<input
						type="number"
						min="0"
						placeholder="∞"
						class="input-bordered input input-sm w-24"
						value={data.filters.maxAmount ?? ''}
						onchange={(e) => updateFilter('maxAmount', e.currentTarget.value)}
					/>
				</label>

				{#if hasActiveFilters}
					<button class="btn gap-1 btn-ghost btn-sm" onclick={clearFilters}>
						<IconFilterDismiss class="size-4" />
						Clear
					</button>
				{/if}
			</div>
		</div>

		{#if data.offers.length === 0}
			<NotFound
				icon={IconTag}
				title="No offers match your filters"
				description="Try adjusting or clearing the filters to see more offers."
				actionLabel="Clear filters"
				actionHref="?"
				actionIcon={IconFilterDismiss}
			/>
		{:else}
			<!-- All Locations Offers -->
			{#if allLocationOffers.length > 0}
				<section class="mb-10">
					<div class="mb-4 flex items-center gap-2">
						<IconGlobe class="size-5 text-secondary" />
						<h2 class="text-lg font-semibold">All Locations</h2>
						<span class="badge badge-sm badge-secondary">{allLocationOffers.length}</span>
					</div>
					<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each allLocationOffers as offer (offer.id)}
							{@render offerCard(offer)}
						{/each}
					</div>
				</section>
			{/if}

			<!-- Location-Specific Offers -->
			{#if specificLocationOffers.length > 0}
				<section>
					<div class="mb-4 flex items-center gap-2">
						<IconLocation class="size-5 text-info" />
						<h2 class="text-lg font-semibold">Location-Specific Offers</h2>
						<span class="badge badge-sm badge-info">{specificLocationOffers.length}</span>
					</div>
					<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each specificLocationOffers as offer (offer.id)}
							{@render offerCard(offer)}
						{/each}
					</div>
				</section>
			{/if}
		{/if}
	{/if}
</BaseLayout>

<!-- Delete confirmation modal -->
{#if offerToDelete}
	<Modal bind:open={showDeleteModal} title="Delete offer" size="small">
		<div class="space-y-4">
			<p class="text-sm text-base-content/70">
				Are you sure you want to delete <span class="font-semibold">{offerToDelete.name}</span>?
				This action cannot be undone.
			</p>

			{#if offerToDelete.reservedCount > 0}
				<div class="alert items-start gap-2 alert-warning">
					<IconWarning class="mt-0.5 size-5 shrink-0" />
					<div class="text-sm">
						<span class="font-semibold">
							{offerToDelete.reservedCount}
							{offerToDelete.reservedCount === 1 ? 'person has' : 'people have'} reserved this offer.
						</span>
						<span>
							Deleting it will cancel {offerToDelete.reservedCount === 1
								? 'their reservation'
								: 'their reservations'}.
						</span>
					</div>
				</div>
			{/if}

			<form
				method="POST"
				action="?/deleteOffer"
				use:enhance={() => {
					deleting = true;
					return async ({ update }) => {
						await update();
						deleting = false;
						showDeleteModal = false;
					};
				}}
				class="flex justify-end gap-2 pt-2"
			>
				<input type="hidden" name="offerId" value={offerToDelete.id} />
				<button
					type="button"
					class="btn btn-ghost btn-sm"
					disabled={deleting}
					onclick={() => (showDeleteModal = false)}
				>
					Cancel
				</button>
				<button type="submit" class="btn gap-1 btn-error btn-sm" disabled={deleting}>
					{#if deleting}
						<span class="loading loading-xs loading-spinner"></span>
					{:else}
						<IconDelete class="size-4" />
					{/if}
					Delete offer
				</button>
			</form>
		</div>
	</Modal>
{/if}
