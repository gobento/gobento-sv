<!-- src/routes/(dock)/donations/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import BaseLayout from '#lib/components/layout/BaseLayout.svelte';
	import StatTile from '#lib/components/ui/StatTile.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import Segmented from '#lib/components/ui/Segmented.svelte';
	import StatusBadge from '#lib/components/ui/StatusBadge.svelte';
	import GiftOfferCard from '#lib/components/donations/GiftOfferCard.svelte';
	import PickupRequestCard from '#lib/components/donations/PickupRequestCard.svelte';
	import UpcomingPickupCard from '#lib/components/donations/UpcomingPickupCard.svelte';
	import { formatDateTime } from '#lib/dates.js';
	import { GIFT_STATUS, PICKUP_STATUS } from '#lib/statuses.js';
	import IconHeart from '~icons/fluent/heart-24-regular';
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
	let tab = $state<'todo' | 'upcoming' | 'regular' | 'history'>('todo');

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

	const tabs = $derived([
		{ value: 'todo' as const, label: 'To do', count: giftOffers.length + pending.length },
		{ value: 'upcoming' as const, label: 'Upcoming', count: upcoming.length },
		{ value: 'regular' as const, label: 'Regular', count: regularDonors.length },
		{ value: 'history' as const, label: 'History', count: history.length }
	]);

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
	description="Food businesses give you — decide what to collect and when"
	icon={IconHeart}
>
	<div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
		<StatTile
			index={0}
			label="Upcoming pickups"
			value={upcoming.length}
			icon={IconCalendar}
			tone="primary"
		/>
		<StatTile
			index={1}
			label="Collected"
			value={data.stats.collected}
			icon={IconBox}
			tone="success"
			hint="{data.stats.collectedThisMonth} in the last 30 days"
		/>
		<StatTile
			index={2}
			label="Regular donors"
			value={data.stats.regularDonors}
			icon={IconRepeat}
			tone="secondary"
		/>
		<StatTile
			index={3}
			label="Businesses"
			value={data.stats.businesses}
			icon={IconBuilding}
			tone="accent"
			hint="that gave to you"
		/>
	</div>

	{#if page.form?.action?.error}
		<div class="mb-6 alert animate-soft-pop alert-error">
			<IconInfo class="size-5 shrink-0" />
			<span>{page.form.action.error}</span>
		</div>
	{/if}

	<Segmented options={tabs} bind:value={tab} label="Donation sections" class="mb-6" />

	{#key tab}
		<div class="animate-fade-in">
			{#if tab === 'todo'}
				{#if giftOffers.length === 0 && pending.length === 0}
					<EmptyState
						icon={IconCheck}
						title="Nothing to answer"
						description="New regular gifts and pickup requests from businesses land here."
						tone="success"
					/>
				{:else}
					<div class="space-y-8">
						{#if giftOffers.length > 0}
							<section>
								<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
									<IconRepeat class="size-5 text-primary" />
									Regular gifts offered to you
									<span class="badge badge-sm badge-primary">{giftOffers.length}</span>
								</h2>
								<div class="space-y-4">
									{#each giftOffers as gift, i (gift.id)}
										<GiftOfferCard {gift} index={i}>
											{#snippet actions()}
												<form
													method="POST"
													action="?/declineGift"
													use:enhance={busy(gift.id, 'Decline this regular gift?')}
												>
													<input type="hidden" name="giftId" value={gift.id} />
													<button
														class="btn gap-2 btn-ghost btn-sm"
														disabled={processingId === gift.id}
													>
														<IconDismiss class="size-4" /> Decline
													</button>
												</form>
												<form method="POST" action="?/acceptGift" use:enhance={busy(gift.id)}>
													<input type="hidden" name="giftId" value={gift.id} />
													<button
														class="btn gap-2 btn-primary btn-sm"
														disabled={processingId === gift.id}
													>
														<IconCheck class="size-4" /> Accept schedule
													</button>
												</form>
											{/snippet}
										</GiftOfferCard>
									{/each}
								</div>
							</section>
						{/if}

						{#if pending.length > 0}
							<section>
								<h2 class="mb-3 text-lg font-semibold">
									Pickup requests
									<span class="badge badge-sm badge-primary">{pending.length}</span>
								</h2>
								<div class="space-y-4">
									{#each pending as req, i (req.id)}
										<PickupRequestCard {req} index={i}>
											{#snippet actions()}
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
											{/snippet}
										</PickupRequestCard>
									{/each}
								</div>
							</section>
						{/if}
					</div>
				{/if}
			{:else if tab === 'upcoming'}
				{#if upcoming.length === 0}
					<EmptyState
						icon={IconCalendar}
						title="Nothing scheduled"
						description="Accepted requests and pickups from regular gifts show up here."
					/>
				{:else}
					<div class="space-y-3">
						{#each upcoming as req, i (req.id)}
							<UpcomingPickupCard {req} index={i} serverNow={data.serverNow}>
								{#snippet actions()}
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
								{/snippet}
							</UpcomingPickupCard>
						{/each}
					</div>
				{/if}
			{:else if tab === 'regular'}
				{#if regularDonors.length === 0}
					<EmptyState
						icon={IconRepeat}
						title="No regular donors yet"
						description="When you accept a business's regular gift, its schedule and status appear here."
					/>
				{:else}
					<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
						{#each regularDonors as gift, i (gift.id)}
							<div
								class="flex animate-rise-in items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 stagger"
								style:--i={i}
							>
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
									<button class="btn btn-ghost btn-xs" disabled={processingId === gift.id}
										>Stop</button
									>
								</form>
							</div>
						{/each}
					</div>
				{/if}
			{:else if history.length > 0}
				<div class="space-y-2">
					{#each history as req, i (req.id)}
						<div
							class="flex animate-rise-in items-start gap-3 rounded-2xl border border-base-300 bg-base-100 p-3 stagger"
							style:--i={i}
						>
							<div class="avatar">
								<div class="w-9 rounded-lg ring ring-base-300">
									<img src={req.logoUrl} alt={req.businessName} />
								</div>
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-semibold">{req.businessName}</p>
								<p class="truncate text-xs text-base-content/60">
									{req.proposedPickupFrom
										? formatDateTime(req.proposedPickupFrom)
										: formatDateTime(req.createdAt)} · {req.message}
								</p>
								{#if req.status === 'declined' && req.notes}
									<p class="text-xs text-base-content/60">Note: {req.notes}</p>
								{/if}
							</div>
							<StatusBadge map={PICKUP_STATUS} status={req.status} />
						</div>
					{/each}
				</div>
			{:else}
				<EmptyState
					icon={IconHeart}
					title="No history yet"
					description="Past pickups and gift schedules will be kept here for reference."
				/>
			{/if}
		</div>
	{/key}
</BaseLayout>
