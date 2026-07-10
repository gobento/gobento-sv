<!-- src/routes/(dock)/charities/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import { FOOD_TYPES, FOOD_TYPE_LABELS } from '$lib/foodTypes';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconMail from '~icons/fluent/mail-24-regular';
	import IconSend from '~icons/fluent/send-24-regular';
	import IconCheck from '~icons/fluent/checkmark-circle-24-regular';
	import IconInfo from '~icons/fluent/info-24-regular';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let foodType = $state(data.filters.foodType ?? '');
	let country = $state(data.filters.country ?? '');

	// Pickup request modal state
	let selectedCharity = $state<PageData['charities'][number] | null>(null);
	let sending = $state(false);
	let formError = $state<string | null>(null);

	function applyFilters() {
		const params = new URLSearchParams();
		if (foodType) params.set('foodType', foodType);
		if (country) params.set('country', country);
		goto(`/charities${params.toString() ? `?${params.toString()}` : ''}`, {
			keepFocus: true,
			noScroll: true
		});
	}

	function openRequest(charity: PageData['charities'][number]) {
		selectedCharity = charity;
		formError = null;
	}

	function closeRequest() {
		selectedCharity = null;
	}

	// Offers that belong to the location chosen in the request form (or all when none selected)
	let requestLocationId = $state('');
	const availableOffers = $derived(
		requestLocationId ? data.offers.filter((o) => o.locationId === requestLocationId) : data.offers
	);

	const statusLabels: Record<string, string> = {
		pending: 'Request pending',
		accepted: 'Accepted',
		declined: 'Declined',
		cancelled: 'Cancelled',
		completed: 'Completed'
	};
</script>

<BaseLayout
	title="Find charities"
	description="Search for a charity to collect surplus food from your locations"
	icon={IconHeart}
>
	<!-- Filters -->
	<div class="mb-6 flex flex-wrap items-end gap-3">
		<div class="form-control">
			<label class="mb-1 block text-sm font-medium" for="foodType">Food type</label>
			<select id="foodType" class="select-bordered select" bind:value={foodType}>
				<option value="">Any food type</option>
				{#each FOOD_TYPES as type}
					<option value={type}>{FOOD_TYPE_LABELS[type]}</option>
				{/each}
			</select>
		</div>

		<div class="form-control">
			<label class="mb-1 block text-sm font-medium" for="country">Country</label>
			<select id="country" class="select-bordered select" bind:value={country}>
				<option value="">Any country</option>
				{#each data.countries as c}
					<option value={c}>{c}</option>
				{/each}
			</select>
		</div>

		<button class="btn gap-2 btn-primary" onclick={applyFilters}>
			<IconSearch class="size-4" />
			Search
		</button>
	</div>

	{#if page.form?.request?.success}
		<div class="alert mb-6 alert-success">
			<IconCheck class="size-5 shrink-0" />
			<span>Your pickup request has been sent.</span>
		</div>
	{/if}

	{#if data.charities.length === 0}
		<div class="rounded-2xl border border-base-300 bg-base-100 p-10 text-center">
			<IconHeart class="mx-auto mb-3 size-10 opacity-30" />
			<p class="font-medium">No charities match your search</p>
			<p class="text-sm text-base-content/60">Try widening the food type or country filters.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each data.charities as charity (charity.accountId)}
				<div class="card border border-base-300 bg-base-100 shadow-sm">
					<div class="card-body gap-4">
						<div class="flex items-center gap-3">
							<div class="avatar">
								<div class="w-12 rounded-xl ring ring-base-300">
									<img src={charity.logoUrl} alt={charity.name} />
								</div>
							</div>
							<div class="min-w-0 flex-1">
								<h2 class="truncate font-semibold">{charity.name}</h2>
								<p class="text-xs text-base-content/60">{charity.country}</p>
							</div>
						</div>

						<p class="line-clamp-3 text-sm text-base-content/70">{charity.description}</p>

						{#if charity.foodTypes.length > 0}
							<div class="flex flex-wrap gap-1.5">
								{#each charity.foodTypes as type}
									<span class="badge badge-outline badge-sm">{FOOD_TYPE_LABELS[type]}</span>
								{/each}
							</div>
						{:else}
							<p class="text-xs italic text-base-content/50">No food preferences set</p>
						{/if}

						<div class="flex items-center gap-1.5 text-xs text-base-content/60">
							<IconMail class="size-4" />
							<a class="link" href="mailto:{charity.contactEmail}">{charity.contactEmail}</a>
						</div>

						<div class="card-actions items-center justify-between">
							{#if charity.lastRequestStatus}
								<span class="badge badge-ghost badge-sm"
									>{statusLabels[charity.lastRequestStatus] ?? charity.lastRequestStatus}</span
								>
							{:else}
								<span></span>
							{/if}
							<button class="btn gap-2 btn-sm btn-primary" onclick={() => openRequest(charity)}>
								<IconSend class="size-4" />
								Request pickup
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</BaseLayout>

<!-- Pickup request modal -->
{#if selectedCharity}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Request a pickup from {selectedCharity.name}</h3>
			<p class="mt-1 text-sm text-base-content/60">
				They'll be notified and can accept or decline your request.
			</p>

			<form
				method="POST"
				action="?/requestPickup"
				class="mt-4 space-y-4"
				use:enhance={() => {
					sending = true;
					formError = null;
					return async ({ result, update }) => {
						sending = false;
						if (result.type === 'success') {
							await update();
							closeRequest();
						} else if (result.type === 'failure') {
							const err = result.data as { request?: { error?: string } };
							formError = err?.request?.error ?? 'Failed to send request';
						}
					};
				}}
			>
				<input type="hidden" name="charityAccountId" value={selectedCharity.accountId} />

				<div class="form-control">
					<label class="mb-1 block text-sm font-medium" for="req-message">Message</label>
					<textarea
						id="req-message"
						name="message"
						class="textarea-bordered textarea h-24 w-full resize-none"
						placeholder="Describe the surplus food available and any details the charity should know..."
						required
						disabled={sending}></textarea>
				</div>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="req-foodType">Food type</label>
						<select
							id="req-foodType"
							name="foodType"
							class="select-bordered select"
							disabled={sending}
						>
							<option value="">Unspecified</option>
							{#each FOOD_TYPES as type}
								<option value={type}>{FOOD_TYPE_LABELS[type]}</option>
							{/each}
						</select>
					</div>

					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="req-location">Location</label>
						<select
							id="req-location"
							name="locationId"
							class="select-bordered select"
							bind:value={requestLocationId}
							disabled={sending}
						>
							<option value="">No specific location</option>
							{#each data.locations as loc}
								<option value={loc.id}>{loc.name} — {loc.city}</option>
							{/each}
						</select>
					</div>
				</div>

				{#if availableOffers.length > 0}
					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="req-offer">Offer (optional)</label>
						<select id="req-offer" name="offerId" class="select-bordered select" disabled={sending}>
							<option value="">No specific offer</option>
							{#each availableOffers as offer}
								<option value={offer.id}>{offer.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="req-from">Pickup from</label>
						<input
							id="req-from"
							name="proposedPickupFrom"
							type="datetime-local"
							class="input-bordered input"
							disabled={sending}
						/>
					</div>
					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="req-until">Pickup until</label>
						<input
							id="req-until"
							name="proposedPickupUntil"
							type="datetime-local"
							class="input-bordered input"
							disabled={sending}
						/>
					</div>
				</div>

				{#if formError}
					<div class="alert alert-error">
						<IconInfo class="size-5 shrink-0" />
						<span class="text-sm">{formError}</span>
					</div>
				{/if}

				<div class="modal-action">
					<button type="button" class="btn btn-ghost" onclick={closeRequest} disabled={sending}>
						Cancel
					</button>
					<button type="submit" class="btn gap-2 btn-primary" disabled={sending}>
						{#if sending}
							<span class="loading loading-sm loading-spinner"></span>
							Sending...
						{:else}
							<IconSend class="size-4" />
							Send request
						{/if}
					</button>
				</div>
			</form>
		</div>
		<button class="modal-backdrop" onclick={closeRequest} aria-label="Close"></button>
	</div>
{/if}
