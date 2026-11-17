<!-- src/routes/(dock)/offers/+page.svelte -->
<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { withSearch } from '#lib/paths.js';
	import { resolve } from '$app/paths';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';
	import IconWarning from '~icons/fluent/warning-24-regular';
	import IconFilterDismiss from '~icons/fluent/filter-dismiss-24-regular';
	import IconPause from '~icons/fluent/pause-24-regular';
	import IconPlay from '~icons/fluent/play-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconGlobe from '~icons/fluent/globe-24-regular';

	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import BaseLayout from '#lib/components/layout/BaseLayout.svelte';
	import Alert from '#lib/components/ui/Alert.svelte';
	import Modal from '#lib/components/ui/Modal.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import { useImagePreloader, extractImageUrls } from '#lib/utils/imagePreloader.svelte.js';
	import ManageOfferCard from '#lib/components/offers/ManageOfferCard.svelte';
	import Segmented from '#lib/components/ui/Segmented.svelte';

	let { data } = $props();

	// Preload offer images for a snappier experience.
	useImagePreloader(() => extractImageUrls(data.offers));

	type StatusFilter = 'all' | 'active' | 'inactive';
	const statusOptions = $derived([
		{ value: 'all' as const, label: 'All', count: data.stats.total },
		{ value: 'active' as const, label: 'Active', count: data.stats.active },
		{ value: 'inactive' as const, label: 'Paused', count: data.stats.total - data.stats.active }
	]);
	let busyOfferId = $state<string | null>(null);

	function offerBusy(id: string) {
		return () => {
			busyOfferId = id;
			return async ({ update }: { update: () => Promise<void> }) => {
				await update();
				busyOfferId = null;
			};
		};
	}

	// Businesses can only post offers once a moderator has approved them
	const isVerified = $derived(data.verificationStatus === 'verified');

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
		const params = new SvelteURLSearchParams(page.url.search);
		if (value === '' || value === 'all' || (key === 'sort' && value === 'newest')) {
			params.delete(key);
		} else {
			params.set(key, value);
		}
		goto(withSearch(resolve('/(dock)/offers'), params), { replace: true, reset: false });
	}

	function clearFilters() {
		goto(resolve('/(dock)/offers'), { replace: true, reset: false });
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

{#snippet offerCard(offer: Offer, index: number)}
	<ManageOfferCard {offer} {index}>
		{#snippet actions()}
			<div class="flex gap-2">
				<form method="POST" action="?/setActive" class="flex-1" use:enhance={offerBusy(offer.id)}>
					<input type="hidden" name="offerId" value={offer.id} />
					<input type="hidden" name="active" value={offer.isActive ? 'false' : 'true'} />
					<button
						class="btn btn-block gap-1 btn-ghost btn-sm"
						disabled={busyOfferId === offer.id}
						aria-label={offer.isActive ? `Pause ${offer.name}` : `Activate ${offer.name}`}
					>
						{#if offer.isActive}
							<IconPause class="size-4" /> Pause
						{:else}
							<IconPlay class="size-4" /> Activate
						{/if}
					</button>
				</form>
				<form method="POST" action="?/duplicateOffer" use:enhance={offerBusy(offer.id)}>
					<input type="hidden" name="offerId" value={offer.id} />
					<button
						class="btn btn-square btn-ghost btn-sm"
						disabled={busyOfferId === offer.id}
						aria-label="Duplicate {offer.name}"
					>
						<IconCopy class="size-4" />
					</button>
				</form>
				<button
					class="btn btn-square btn-ghost text-error btn-sm"
					aria-label="Delete offer"
					onclick={() => requestDelete(offer)}
				>
					<IconDelete class="size-4" />
				</button>
			</div>
		{/snippet}
	</ManageOfferCard>
{/snippet}

<BaseLayout
	title="Business Offers"
	description="Manage your special offers and promotions"
	icon={IconTag}
>
	{#if !isVerified}
		<Alert type="warn" class="mb-6">
			{#if data.verificationStatus === 'rejected'}
				Your business was not approved, so you can't post offers. Please contact our team for the
				next steps.
			{:else}
				Your business is awaiting moderator approval. You'll be able to create offers once it's
				verified.
			{/if}
		</Alert>
	{/if}

	{#if data.stats.total === 0}
		<EmptyState
			icon={IconTag}
			title="No offers yet"
			description={isVerified
				? 'Create your first offer to attract customers and boost your business'
				: 'You can create offers once your business has been approved by a moderator'}
			actionLabel={isVerified ? 'Create first offer' : undefined}
			actionHref={isVerified ? resolve('/(dock)/offers/new') : undefined}
			actionIcon={isVerified ? IconAdd : undefined}
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
			{#if isVerified}
				<a href={resolve('/(dock)/offers/new')} class="btn gap-2 btn-primary">
					<IconAdd class="size-5" />
					Create Offer
				</a>
			{/if}
		</div>

		<!-- Filter bar -->
		<div class="mb-8 space-y-4 rounded-2xl border border-base-300 bg-base-100 p-4">
			<Segmented
				options={statusOptions}
				value={data.filters.status as StatusFilter}
				label="Offer status"
				onchange={(value) => updateFilter('status', value)}
				class="sm:max-w-sm"
			/>
			<div class="flex flex-wrap items-end gap-4">
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
					<span class="label-text mb-1 text-xs text-base-content/60">Min bags</span>
					<input
						type="number"
						min="0"
						placeholder="0"
						class="input-bordered input w-24 input-sm"
						value={data.filters.minAmount ?? ''}
						onchange={(e) => updateFilter('minAmount', e.currentTarget.value)}
					/>
				</label>
				<label class="form-control">
					<span class="label-text mb-1 text-xs text-base-content/60">Max bags</span>
					<input
						type="number"
						min="0"
						placeholder="∞"
						class="input-bordered input w-24 input-sm"
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
			<EmptyState
				icon={IconTag}
				title="No offers match your filters"
				description="Try adjusting or clearing the filters to see more offers."
				actionLabel="Clear filters"
				actionHref={resolve('/(dock)/offers')}
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
						{#each allLocationOffers as offer, i (offer.id)}
							{@render offerCard(offer, i)}
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
						{#each specificLocationOffers as offer, i (offer.id)}
							{@render offerCard(offer, i)}
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
