<!-- src/routes/(dock)/charities/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BaseLayout from '#lib/components/BaseLayout.svelte';
	import { FOOD_TYPES, FOOD_TYPE_LABELS } from '#lib/foodTypes.js';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconMail from '~icons/fluent/mail-24-regular';
	import IconSend from '~icons/fluent/send-24-regular';
	import IconCheck from '~icons/fluent/checkmark-circle-24-regular';
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconPause from '~icons/fluent/pause-24-regular';
	import IconPlay from '~icons/fluent/play-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import StatusBadge from '#lib/components/ui/StatusBadge.svelte';
	import { GIFT_STATUS } from '#lib/statuses.js';
	import { formatMoment } from '#lib/components/reservations/pickup.js';
	import {
		GIFT_FREQUENCIES,
		GIFT_FREQUENCY_LABELS,
		WEEKDAYS,
		MAX_DAY_OF_MONTH,
		ordinal
	} from '#lib/recurringGifts.js';

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
		goto(`/charities${params.toString() ? `?${params.toString()}` : ''}`, { reset: false });
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

	// Regular gift modal state
	let giftCharity = $state<PageData['charities'][number] | null>(null);
	let giftFrequency = $state<(typeof GIFT_FREQUENCIES)[number]>('weekly');
	let giftSending = $state(false);
	let giftError = $state<string | null>(null);
	let giftActionId = $state<string | null>(null);
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const todayIso = (() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	})();

	function openGift(charity: PageData['charities'][number]) {
		giftCharity = charity;
		giftFrequency = 'weekly';
		giftError = null;
	}

	function giftActions(status: string): ('pauseGift' | 'resumeGift' | 'endGift')[] {
		if (status === 'active') return ['pauseGift', 'endGift'];
		if (status === 'paused') return ['resumeGift', 'endGift'];
		return ['endGift'];
	}

	const openGifts = $derived(
		data.gifts.filter((g) => g.status === 'proposed' || g.status === 'active' || g.status === 'paused')
	);
	const pastGifts = $derived(
		data.gifts.filter((g) => g.status === 'declined' || g.status === 'ended')
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

	<!-- Regular gifts -->
	<section class="mb-8">
		<div class="mb-3 flex items-end justify-between gap-3">
			<div>
				<h2 class="flex items-center gap-2 text-lg font-semibold">
					<IconRepeat class="size-5 text-primary" />
					Regular gifts
				</h2>
				<p class="text-sm text-base-content/60">
					Give to a charity on a fixed schedule. Once they accept, every pickup is booked for you
					three days ahead.
				</p>
			</div>
		</div>

		{#if page.form?.gift?.success}
			<div class="mb-4 alert alert-success">
				<IconCheck class="size-5 shrink-0" />
				<span>Your regular gift was sent. The charity will be notified to accept it.</span>
			</div>
		{/if}
		{#if page.form?.giftAction?.error}
			<div class="mb-4 alert alert-error">
				<IconInfo class="size-5 shrink-0" />
				<span>{page.form.giftAction.error}</span>
			</div>
		{/if}

		{#if openGifts.length === 0}
			<div class="rounded-2xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70">
				You don't give regularly yet. Pick a charity below and choose <strong>Give regularly</strong>
				— for example every Friday after closing.
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
				{#each openGifts as gift (gift.id)}
					<div class="card border border-base-300 bg-base-100 shadow-sm">
						<div class="card-body gap-3 p-4">
							<div class="flex items-center gap-3">
								<div class="avatar">
									<div class="w-10 rounded-xl ring ring-base-300">
										<img src={gift.logoUrl} alt={gift.charityName} />
									</div>
								</div>
								<div class="min-w-0 flex-1">
									<h3 class="truncate font-semibold">{gift.charityName}</h3>
									<p class="truncate text-sm text-base-content/70">{gift.schedule}</p>
								</div>
								<StatusBadge map={GIFT_STATUS} status={gift.status} />
							</div>
							<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
								{#if gift.locationName}<span>{gift.locationName}</span>{/if}
								{#if gift.foodType}<span>{FOOD_TYPE_LABELS[gift.foodType]}</span>{/if}
								{#if gift.status === 'active' && gift.nextOccurrenceAt}
									<span>Next to be booked: {formatMoment(gift.nextOccurrenceAt)}</span>
								{/if}
								<span>{gift.pickups} {gift.pickups === 1 ? 'pickup' : 'pickups'} so far</span>
							</div>
							<div class="card-actions justify-end">
								{#each giftActions(gift.status) as action}
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
											class="btn gap-1.5 btn-sm {action === 'endGift' ? 'btn-ghost' : 'btn-outline'}"
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
								{/each}
							</div>
						</div>
					</div>
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

	<h2 class="mb-3 text-lg font-semibold">Find a charity</h2>

	{#if page.form?.request?.success}
		<div class="mb-6 alert alert-success">
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
							<p class="text-xs text-base-content/50 italic">No food preferences set</p>
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
							<div class="flex flex-wrap justify-end gap-2">
								{#if charity.giftStatus}
									<span class="badge gap-1 badge-sm badge-primary badge-outline">
										<IconRepeat class="size-3" />
										{charity.giftStatus === 'proposed' ? 'Regular gift proposed' : 'Regular gift'}
									</span>
								{:else}
									<button class="btn gap-2 btn-outline btn-sm" onclick={() => openGift(charity)}>
										<IconRepeat class="size-4" />
										Give regularly
									</button>
								{/if}
								<button class="btn gap-2 btn-primary btn-sm" onclick={() => openRequest(charity)}>
									<IconSend class="size-4" />
									Request pickup
								</button>
							</div>
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

<!-- Regular gift modal -->
{#if giftCharity}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Give regularly to {giftCharity.name}</h3>
			<p class="mt-1 text-sm text-base-content/60">
				They accept the schedule once. After that each pickup is booked automatically three days
				ahead, and you can pause or end the gift at any time.
			</p>

			<form
				method="POST"
				action="?/proposeGift"
				class="mt-4 space-y-4"
				use:enhance={() => {
					giftSending = true;
					giftError = null;
					return async ({ result, update }) => {
						giftSending = false;
						if (result.type === 'success') {
							await update();
							giftCharity = null;
						} else if (result.type === 'failure') {
							const err = result.data as { gift?: { error?: string } };
							giftError = err?.gift?.error ?? 'Failed to set up the regular gift';
						}
					};
				}}
			>
				<input type="hidden" name="charityAccountId" value={giftCharity.accountId} />
				<input type="hidden" name="timeZone" value={timeZone} />

				<div class="form-control">
					<span class="mb-1 block text-sm font-medium">How often</span>
					<div class="join w-full">
						{#each GIFT_FREQUENCIES as freq}
							<input
								class="btn join-item flex-1 btn-sm"
								type="radio"
								name="frequency"
								value={freq}
								aria-label={GIFT_FREQUENCY_LABELS[freq]}
								bind:group={giftFrequency}
								disabled={giftSending}
							/>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
					{#if giftFrequency === 'monthly'}
						<div class="form-control">
							<label class="mb-1 block text-sm font-medium" for="gift-day">Day of month</label>
							<select id="gift-day" name="dayOfMonth" class="select-bordered select" disabled={giftSending}>
								{#each Array.from({ length: MAX_DAY_OF_MONTH }, (_, i) => i + 1) as d}
									<option value={d}>{ordinal(d)}</option>
								{/each}
							</select>
						</div>
					{:else}
						<div class="form-control">
							<label class="mb-1 block text-sm font-medium" for="gift-weekday">Weekday</label>
							<select
								id="gift-weekday"
								name="weekday"
								class="select-bordered select"
								value={String(new Date().getDay())}
								disabled={giftSending}
							>
								{#each WEEKDAYS as day, i}
									<option value={String(i)}>{day}</option>
								{/each}
							</select>
						</div>
					{/if}
					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="gift-from">Pickup from</label>
						<input
							id="gift-from"
							name="pickupTimeFrom"
							type="time"
							class="input-bordered input"
							value="18:00"
							required
							disabled={giftSending}
						/>
					</div>
					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="gift-until">until</label>
						<input
							id="gift-until"
							name="pickupTimeUntil"
							type="time"
							class="input-bordered input"
							value="19:00"
							required
							disabled={giftSending}
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="gift-location">Location</label>
						<select id="gift-location" name="locationId" class="select-bordered select" disabled={giftSending}>
							{#if data.locations.length !== 1}<option value="">No specific location</option>{/if}
							{#each data.locations as loc}
								<option value={loc.id}>{loc.name} — {loc.city}</option>
							{/each}
						</select>
					</div>
					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="gift-food">Food type</label>
						<select id="gift-food" name="foodType" class="select-bordered select" disabled={giftSending}>
							<option value="">Mixed</option>
							{#each FOOD_TYPES as type}
								<option value={type} selected={giftCharity.foodTypes.length === 1 && giftCharity.foodTypes[0] === type}
									>{FOOD_TYPE_LABELS[type]}</option
								>
							{/each}
						</select>
					</div>
					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="gift-start">Starting</label>
						<input
							id="gift-start"
							name="startsOn"
							type="date"
							class="input-bordered input"
							min={todayIso}
							value={todayIso}
							disabled={giftSending}
						/>
					</div>
				</div>

				<div class="form-control">
					<label class="mb-1 block text-sm font-medium" for="gift-message">What you usually have</label>
					<textarea
						id="gift-message"
						name="message"
						class="textarea-bordered textarea h-20 w-full resize-none"
						placeholder="e.g. Unsold bread and pastries from the day, usually 2–3 crates."
						required
						disabled={giftSending}></textarea>
				</div>

				{#if giftError}
					<div class="alert alert-error">
						<IconInfo class="size-5 shrink-0" />
						<span class="text-sm">{giftError}</span>
					</div>
				{/if}

				<div class="modal-action">
					<button type="button" class="btn btn-ghost" onclick={() => (giftCharity = null)} disabled={giftSending}>
						Cancel
					</button>
					<button type="submit" class="btn gap-2 btn-primary" disabled={giftSending}>
						{#if giftSending}
							<span class="loading loading-sm loading-spinner"></span>
							Sending...
						{:else}
							<IconRepeat class="size-4" />
							Propose regular gift
						{/if}
					</button>
				</div>
			</form>
		</div>
		<button class="modal-backdrop" onclick={() => (giftCharity = null)} aria-label="Close"></button>
	</div>
{/if}
