<!-- src/routes/(dock)/donations/+page.svelte -->
<script lang="ts">
	import { formatDateTime } from '#lib/dates.js';
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import BaseLayout from '#lib/components/BaseLayout.svelte';
	import StatTile from '#lib/components/ui/StatTile.svelte';
	import PickupQr from '#lib/components/reservations/PickupQr.svelte';
	import StatusBadge from '#lib/components/ui/StatusBadge.svelte';
	import { GIFT_STATUS, PICKUP_STATUS } from '#lib/statuses.js';
	import { formatPickupWindow } from '#lib/components/reservations/pickup.js';
	import { FOOD_TYPE_LABELS, isFoodType } from '#lib/foodTypes.js';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconCheck from '~icons/fluent/checkmark-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconBox from '~icons/fluent/box-24-regular';
	import IconBuilding from '~icons/fluent/building-shop-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconInfo from '~icons/fluent/info-24-regular';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let processingId = $state<string | null>(null);

	function formatDate(value: string | Date | null): string {
		if (!value) return '';
		return formatDateTime(value);
	}

	const GRACE_MS = 6 * 60 * 60 * 1000;
	const now = Date.now();

	const giftOffers = $derived(data.gifts.filter((g) => g.status === 'proposed'));
	const regularDonors = $derived(data.gifts.filter((g) => g.status !== 'proposed'));
	const pending = $derived(data.requests.filter((r) => r.status === 'pending'));
	/** Accepted pickups that are still ahead (or just finished, so they can be ticked off). */
	const upcoming = $derived(
		data.requests
			.filter(
				(r) =>
					r.status === 'accepted' &&
					(!r.proposedPickupUntil || new Date(r.proposedPickupUntil).getTime() + GRACE_MS > now)
			)
			.sort(
				(a, b) =>
					new Date(a.proposedPickupFrom ?? a.createdAt).getTime() -
					new Date(b.proposedPickupFrom ?? b.createdAt).getTime()
			)
	);
	const history = $derived(
		data.requests.filter((r) => r.status !== 'pending' && !upcoming.includes(r))
	);

	/** Same enhance handler for every small action form on this page. */
	function busy(id: string, question?: string) {
		return ({ cancel }: { cancel: () => void }) => {
			if (question && !confirm(question)) {
				cancel();
				return;
			}
			processingId = id;
			return async ({ update }: { update: () => Promise<void> }) => {
				processingId = null;
				await update();
			};
		};
	}
</script>

<BaseLayout
	title="Donations"
	description="Food that businesses give you — regular gifts, upcoming pickups and requests"
	icon={IconHeart}
>
	<div class="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
		<StatTile label="Upcoming pickups" value={upcoming.length} icon={IconCalendar} tone="primary" />
		<StatTile
			label="Collected"
			value={data.stats.collected}
			icon={IconBox}
			tone="success"
			hint="{data.stats.collectedThisMonth} in the last 30 days"
		/>
		<StatTile
			label="Regular donors"
			value={data.stats.regularDonors}
			icon={IconRepeat}
			tone="secondary"
		/>
		<StatTile
			label="Businesses"
			value={data.stats.businesses}
			icon={IconBuilding}
			tone="accent"
			hint="that gave to you"
		/>
	</div>

	{#if page.form?.action?.error}
		<div class="mb-6 alert alert-error">
			<IconInfo class="size-5 shrink-0" />
			<span>{page.form.action.error}</span>
		</div>
	{/if}

	{#if giftOffers.length > 0}
		<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
			<IconRepeat class="size-5 text-primary" />
			Regular gifts offered to you
		</h2>
		<div class="mb-8 space-y-4">
			{#each giftOffers as gift (gift.id)}
				<div class="card border-2 border-primary/30 bg-base-100 shadow-sm">
					<div class="card-body gap-3">
						<div class="flex items-start gap-3">
							<div class="avatar">
								<div class="w-12 rounded-xl ring ring-base-300">
									<img src={gift.logoUrl} alt={gift.businessName} />
								</div>
							</div>
							<div class="min-w-0 flex-1">
								<h3 class="font-semibold">{gift.businessName}</h3>
								<p class="text-sm font-medium text-primary">{gift.schedule}</p>
							</div>
						</div>
						<p class="text-sm text-base-content/80">{gift.message}</p>
						<div class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-base-content/70">
							{#if gift.foodType && isFoodType(gift.foodType)}
								<span class="inline-flex items-center gap-1.5">
									<IconTag class="size-4" />{FOOD_TYPE_LABELS[gift.foodType]}
								</span>
							{/if}
							{#if gift.locationName}
								<span class="inline-flex items-center gap-1.5">
									<IconLocation class="size-4" />{gift.locationName}{gift.locationAddress
										? `, ${gift.locationAddress}`
										: ''}
								</span>
							{/if}
						</div>
						<p class="text-xs text-base-content/60">
							Accepting books every pickup for you automatically, three days ahead. You can call off
							a single pickup or stop the gift at any time.
						</p>
						<div class="card-actions justify-end">
							<form
								method="POST"
								action="?/declineGift"
								use:enhance={busy(gift.id, 'Decline this regular gift?')}
							>
								<input type="hidden" name="giftId" value={gift.id} />
								<button class="btn gap-2 btn-ghost btn-sm" disabled={processingId === gift.id}>
									<IconDismiss class="size-4" /> Decline
								</button>
							</form>
							<form method="POST" action="?/acceptGift" use:enhance={busy(gift.id)}>
								<input type="hidden" name="giftId" value={gift.id} />
								<button class="btn gap-2 btn-primary btn-sm" disabled={processingId === gift.id}>
									<IconCheck class="size-4" /> Accept schedule
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if pending.length > 0}
		<h2 class="mb-3 text-lg font-semibold">Pickup requests</h2>
		<div class="mb-8 space-y-4">
			{#each pending as req (req.id)}
				<div class="card border border-base-300 bg-base-100 shadow-sm">
					<div class="card-body gap-4">
						<div class="flex items-start gap-3">
							<div class="avatar">
								<div class="w-12 rounded-xl ring ring-base-300">
									<img src={req.logoUrl} alt={req.businessName} />
								</div>
							</div>
							<div class="min-w-0 flex-1">
								<h3 class="font-semibold">{req.businessName}</h3>
								<p class="text-xs text-base-content/60">Requested {formatDate(req.createdAt)}</p>
							</div>
							<StatusBadge map={PICKUP_STATUS} status={req.status} />
						</div>

						<p class="text-sm text-base-content/80">{req.message}</p>

						<div class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-base-content/70">
							{#if req.foodType && isFoodType(req.foodType)}
								<span class="inline-flex items-center gap-1.5">
									<IconTag class="size-4" />
									{FOOD_TYPE_LABELS[req.foodType]}
								</span>
							{/if}
							{#if req.offerName}
								<span class="inline-flex items-center gap-1.5">
									<IconTag class="size-4" />
									{req.offerName}
								</span>
							{/if}
							{#if req.locationName}
								<span class="inline-flex items-center gap-1.5">
									<IconLocation class="size-4" />
									{req.locationName}{req.locationCity ? `, ${req.locationCity}` : ''}
								</span>
							{/if}
							{#if req.proposedPickupFrom}
								<span class="inline-flex items-center gap-1.5">
									<IconClock class="size-4" />
									{formatDate(req.proposedPickupFrom)}
									{#if req.proposedPickupUntil}– {formatDate(req.proposedPickupUntil)}{/if}
								</span>
							{/if}
						</div>

						<div class="card-actions justify-end">
							<form method="POST" action="?/declineRequest" use:enhance={busy(req.id)}>
								<input type="hidden" name="requestId" value={req.id} />
								<button
									type="submit"
									class="btn gap-2 btn-ghost btn-sm"
									disabled={processingId === req.id}
								>
									<IconDismiss class="size-4" />
									Decline
								</button>
							</form>
							<form method="POST" action="?/acceptRequest" use:enhance={busy(req.id)}>
								<input type="hidden" name="requestId" value={req.id} />
								<button
									type="submit"
									class="btn gap-2 btn-primary btn-sm"
									disabled={processingId === req.id}
								>
									{#if processingId === req.id}
										<span class="loading loading-xs loading-spinner"></span>
									{:else}
										<IconCheck class="size-4" />
									{/if}
									Accept
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<h2 class="mb-3 text-lg font-semibold">Upcoming pickups</h2>
	{#if upcoming.length === 0}
		<div
			class="mb-8 rounded-2xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70"
		>
			Nothing scheduled. Accepted requests and pickups from regular gifts show up here.
		</div>
	{:else}
		<div class="mb-8 space-y-3">
			{#each upcoming as req (req.id)}
				<div class="card border border-base-300 bg-base-100 shadow-sm">
					<div class="card-body gap-3 p-4">
						<div class="flex items-start gap-3">
							<div class="avatar">
								<div class="w-10 rounded-xl ring ring-base-300">
									<img src={req.logoUrl} alt={req.businessName} />
								</div>
							</div>
							<div class="min-w-0 flex-1">
								<h3 class="font-semibold">
									{#if req.proposedPickupFrom && req.proposedPickupUntil}
										{formatPickupWindow(req.proposedPickupFrom, req.proposedPickupUntil)}
									{:else}
										Time to be agreed
									{/if}
								</h3>
								<p class="text-sm text-base-content/70">
									{req.businessName}{#if req.locationName}
										· {req.locationName}{req.locationAddress ? `, ${req.locationAddress}` : ''}{/if}
								</p>
							</div>
							{#if req.recurringGiftId}
								<span class="badge gap-1 badge-outline badge-sm badge-primary"
									><IconRepeat class="size-3" /> Regular</span
								>
							{/if}
						</div>
						<p class="text-sm text-base-content/70">{req.message}</p>
						{#if req.reservationId && req.reservationClaimToken && req.reservationStatus === 'active'}
							<details class="rounded-xl bg-base-200/60 p-3">
								<summary class="cursor-pointer text-sm font-semibold">Show pickup code</summary>
								<div class="mt-3">
									<PickupQr
										reservationId={req.reservationId}
										claimToken={req.reservationClaimToken}
										serverNow={data.serverNow}
									/>
								</div>
							</details>
						{/if}
						<div class="card-actions justify-end">
							<form
								method="POST"
								action="?/skipPickup"
								use:enhance={busy(req.id, 'Call off this pickup? The business will be told.')}
							>
								<input type="hidden" name="requestId" value={req.id} />
								<button class="btn btn-ghost btn-sm" disabled={processingId === req.id}
									>Can't make it</button
								>
							</form>
							<form method="POST" action="?/markCollected" use:enhance={busy(req.id)}>
								<input type="hidden" name="requestId" value={req.id} />
								<button class="btn gap-2 btn-sm btn-success" disabled={processingId === req.id}>
									<IconCheck class="size-4" /> Collected
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if regularDonors.length > 0}
		<h2 class="mb-3 text-lg font-semibold">Regular donors</h2>
		<div class="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
			{#each regularDonors as gift (gift.id)}
				<div class="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-4">
					<div class="avatar">
						<div class="w-10 rounded-xl ring ring-base-300">
							<img src={gift.logoUrl} alt={gift.businessName} />
						</div>
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate font-semibold">{gift.businessName}</p>
						<p class="truncate text-sm text-base-content/70">{gift.schedule}</p>
					</div>
					<StatusBadge map={GIFT_STATUS} status={gift.status} />
					<form
						method="POST"
						action="?/stopGift"
						use:enhance={busy(gift.id, `Stop collecting from ${gift.businessName}?`)}
					>
						<input type="hidden" name="giftId" value={gift.id} />
						<button class="btn btn-ghost btn-xs" disabled={processingId === gift.id}>Stop</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}

	{#if history.length > 0}
		<h2 class="mb-3 text-lg font-semibold">History</h2>
		<div class="space-y-2">
			{#each history as req (req.id)}
				<div class="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-100 p-3">
					<div class="avatar">
						<div class="w-9 rounded-lg ring ring-base-300">
							<img src={req.logoUrl} alt={req.businessName} />
						</div>
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-semibold">{req.businessName}</p>
						<p class="truncate text-xs text-base-content/60">
							{req.proposedPickupFrom
								? formatDate(req.proposedPickupFrom)
								: formatDate(req.createdAt)} · {req.message}
						</p>
						{#if req.status === 'declined' && req.notes}
							<p class="text-xs text-base-content/60">Note: {req.notes}</p>
						{/if}
					</div>
					<StatusBadge map={PICKUP_STATUS} status={req.status} />
				</div>
			{/each}
		</div>
	{/if}

	{#if data.requests.length === 0 && data.gifts.length === 0}
		<div class="mt-6 rounded-2xl border border-base-300 bg-base-100 p-10 text-center">
			<IconHeart class="mx-auto mb-3 size-10 opacity-30" />
			<p class="font-medium">Nothing here yet</p>
			<p class="text-sm text-base-content/60">
				When a business offers you food, once or on a regular schedule, it will appear here.
			</p>
		</div>
	{/if}
</BaseLayout>
