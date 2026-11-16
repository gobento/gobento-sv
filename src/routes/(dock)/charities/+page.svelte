<!-- src/routes/(dock)/charities/+page.svelte -->
<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { withSearch } from '#lib/paths.js';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BaseLayout from '#lib/components/layout/BaseLayout.svelte';
	import { FOOD_TYPES, FOOD_TYPE_LABELS } from '#lib/foodTypes.js';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconCheck from '~icons/fluent/checkmark-circle-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconPause from '~icons/fluent/pause-24-regular';
	import IconPlay from '~icons/fluent/play-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import StatusBadge from '#lib/components/ui/StatusBadge.svelte';
	import Segmented from '#lib/components/ui/Segmented.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import { GIFT_STATUS } from '#lib/statuses.js';
	import CharityCard from '#lib/components/charities/CharityCard.svelte';
	import RegularGiftCard from '#lib/components/charities/RegularGiftCard.svelte';
	import RequestPickupModal from '#lib/components/charities/RequestPickupModal.svelte';
	import RegularGiftModal from '#lib/components/charities/RegularGiftModal.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let foodType = $state(data.filters.foodType ?? '');
	let country = $state(data.filters.country ?? '');
	let tab = $state<'gifts' | 'find'>('gifts');

	// Only the choice of dialog is kept here; each dialog owns its own form state.
	let selectedCharity = $state<PageData['charities'][number] | null>(null);
	let giftCharity = $state<PageData['charities'][number] | null>(null);
	let giftActionId = $state<string | null>(null);

	function applyFilters() {
		const params = new SvelteURLSearchParams();
		if (foodType) params.set('foodType', foodType);
		if (country) params.set('country', country);
		goto(withSearch(resolve('/(dock)/charities'), params), { reset: false });
	}

	const openGifts = $derived(
		data.gifts.filter(
			(g) => g.status === 'proposed' || g.status === 'active' || g.status === 'paused'
		)
	);
	const pastGifts = $derived(
		data.gifts.filter((g) => g.status === 'declined' || g.status === 'ended')
	);

	const tabs = $derived([
		{ value: 'gifts' as const, label: 'Regular gifts', count: openGifts.length },
		{ value: 'find' as const, label: 'Find charities', count: data.charities.length }
	]);
</script>

<BaseLayout
	title="Charities"
	description="Your regular giving, and the charities who can collect your surplus"
	icon={IconHeart}
>
	<Segmented options={tabs} bind:value={tab} label="Charity sections" class="mb-6" />

	{#key tab}
		<div class="animate-fade-in">
			{#if tab === 'gifts'}
				<section>
					<div class="mb-3 flex items-end justify-between gap-3">
						<div>
							<h2 class="flex items-center gap-2 text-lg font-semibold">
								<IconRepeat class="size-5 text-primary" />
								Regular gifts
							</h2>
							<p class="text-sm text-base-content/60">
								Give to a charity on a fixed schedule. Once they accept, every pickup is booked for
								you three days ahead.
							</p>
						</div>
					</div>

					{#if page.form?.gift?.success}
						<div class="mb-4 alert animate-soft-pop alert-success">
							<IconCheck class="size-5 shrink-0" />
							<span>Your regular gift was sent. The charity will be notified to accept it.</span>
						</div>
					{/if}
					{#if page.form?.giftAction?.error}
						<div class="mb-4 alert alert-error">
							<span>{page.form.giftAction.error}</span>
						</div>
					{/if}

					{#if openGifts.length === 0}
						<EmptyState
							icon={IconRepeat}
							title="No regular gifts yet"
							description="Give surplus food on a fixed schedule. Once a charity accepts, every pickup is booked for you three days ahead."
						>
							{#snippet actions()}
								<button class="btn gap-2 btn-primary btn-sm" onclick={() => (tab = 'find')}>
									<IconSearch class="size-4" /> Find a charity
								</button>
							{/snippet}
						</EmptyState>
					{:else}
						<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
							{#each openGifts as gift, i (gift.id)}
								<RegularGiftCard {gift} index={i}>
									{#snippet actions(action)}
										<form
											method="POST"
											action="?/{action}"
											use:enhance={({ cancel }) => {
												if (
													action === 'endGift' &&
													!confirm(
														gift.status === 'proposed'
															? 'Withdraw this regular gift?'
															: 'End this regular gift? Upcoming pickups are called off.'
													)
												) {
													cancel();
													return;
												}
												giftActionId = gift.id;
												return async ({ update }) => {
													giftActionId = null;
													await update();
												};
											}}
										>
											<input type="hidden" name="giftId" value={gift.id} />
											<button
												class="btn gap-1.5 btn-sm {action === 'endGift'
													? 'btn-ghost'
													: 'btn-outline'}"
												disabled={giftActionId === gift.id}
											>
												{#if action === 'pauseGift'}
													<IconPause class="size-4" /> Pause
												{:else if action === 'resumeGift'}
													<IconPlay class="size-4" /> Resume
												{:else}
													<IconDismiss class="size-4" />
													{gift.status === 'proposed' ? 'Withdraw' : 'End'}
												{/if}
											</button>
										</form>
									{/snippet}
								</RegularGiftCard>
							{/each}
						</div>
					{/if}

					{#if pastGifts.length > 0}
						<details class="mt-3 text-sm">
							<summary class="cursor-pointer text-base-content/60">
								{pastGifts.length} past {pastGifts.length === 1 ? 'gift' : 'gifts'}
							</summary>
							<ul class="mt-2 space-y-1">
								{#each pastGifts as gift (gift.id)}
									<li class="flex flex-wrap items-center gap-2 text-base-content/70">
										<StatusBadge map={GIFT_STATUS} status={gift.status} />
										<span class="font-medium">{gift.charityName}</span>
										<span>{gift.schedule}</span>
										<span>· {gift.pickups} pickups</span>
										{#if gift.status === 'declined' && gift.notes}<span>· “{gift.notes}”</span>{/if}
									</li>
								{/each}
							</ul>
						</details>
					{/if}
				</section>
			{:else}
				<div class="mb-6 flex flex-wrap items-end gap-3">
					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="foodType">Food type</label>
						<select id="foodType" class="select-bordered select" bind:value={foodType}>
							<option value="">Any food type</option>
							{#each FOOD_TYPES as type (type)}
								<option value={type}>{FOOD_TYPE_LABELS[type]}</option>
							{/each}
						</select>
					</div>

					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="country">Country</label>
						<select id="country" class="select-bordered select" bind:value={country}>
							<option value="">Any country</option>
							{#each data.countries as c (c)}
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
					<div class="mb-6 alert animate-soft-pop alert-success">
						<IconCheck class="size-5 shrink-0" />
						<span>Your pickup request has been sent.</span>
					</div>
				{/if}

				{#if data.charities.length === 0}
					<EmptyState
						icon={IconHeart}
						title="No charities match your search"
						description="Try widening the food type or country filters."
					/>
				{:else}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
						{#each data.charities as charity, i (charity.accountId)}
							<CharityCard
								{charity}
								index={i}
								onGift={(c) => (giftCharity = c)}
								onRequest={(c) => (selectedCharity = c)}
							/>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	{/key}
</BaseLayout>

{#if selectedCharity}
	<RequestPickupModal
		charity={selectedCharity}
		locations={data.locations}
		offers={data.offers}
		onClose={() => (selectedCharity = null)}
	/>
{/if}

{#if giftCharity}
	<RegularGiftModal
		charity={giftCharity}
		locations={data.locations}
		onClose={() => (giftCharity = null)}
	/>
{/if}
