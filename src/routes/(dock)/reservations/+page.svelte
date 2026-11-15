<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly } from 'svelte/transition';
	import IconBag from '~icons/fluent/shopping-bag-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconHistory from '~icons/fluent/history-24-regular';
	import IconChevron from '~icons/fluent/chevron-right-24-regular';
	import IconReceipt from '~icons/fluent/receipt-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';
	import BaseLayout from '#lib/components/BaseLayout.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import Segmented from '#lib/components/ui/Segmented.svelte';
	import StatusBadge from '#lib/components/ui/StatusBadge.svelte';
	import BusinessLogo from '#lib/components/reservations/BusinessLogo.svelte';
	import { formatPickupWindow, pickupPhase } from '#lib/components/reservations/pickup.js';
	import { receiptSubmit } from '#lib/components/reservations/receipt.js';
	import { RESERVATION_STATUS } from '#lib/statuses.js';
	import { formatPrice } from '#lib/util.js';

	let { data } = $props();

	type View = 'upcoming' | 'past';

	let view = $state<View>('upcoming');
	let receiptPendingId = $state<string | null>(null);
	let now = $state(Date.now());

	// Keeps "Today"/"Ready now" honest while the page stays open.
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(timer);
	});

	const upcoming = $derived(
		data.reservations
			.filter((reservation) => reservation.status === 'active')
			.toSorted((a, b) => a.pickupFrom.getTime() - b.pickupFrom.getTime())
	);
	const past = $derived(data.reservations.filter((reservation) => reservation.status !== 'active'));
	const shown = $derived(view === 'upcoming' ? upcoming : past);

	const options = $derived([
		{ value: 'upcoming' as const, label: 'Upcoming', count: upcoming.length },
		{ value: 'past' as const, label: 'Past', count: past.length }
	]);
</script>

<svelte:head>
	<title>Orders · GoBento</title>
</svelte:head>

<BaseLayout title="Orders" description="Your reserved bags and pickup tickets" icon={IconBag}>
	<Segmented {options} bind:value={view} label="Filter orders" class="mb-5 sm:max-w-sm" />

	{#key view}
		<div in:fly={{ y: 10, duration: 220 }}>
			{#if shown.length === 0}
				{#if view === 'upcoming'}
					<EmptyState
						icon={IconBag}
						title="Nothing to pick up yet"
						description="Reserve a surprise bag nearby and your pickup ticket will show up here."
						actionLabel="Discover offers"
						actionHref="/discover"
						actionIcon={IconSearch}
					/>
				{:else}
					<EmptyState
						icon={IconHistory}
						tone="muted"
						title="No past orders"
						description="Bags you have collected will be listed here, together with their receipts."
						actionLabel="Discover offers"
						actionHref="/discover"
						actionIcon={IconSearch}
					/>
				{/if}
			{:else}
				<ul class="grid gap-3 lg:grid-cols-2">
					{#each shown as reservation, i (reservation.id)}
						{@const ready =
							reservation.status === 'active' &&
							pickupPhase(reservation.pickupFrom, reservation.pickupUntil, now) === 'open'}
						<li
							class="surface flex animate-rise-in flex-col stagger"
							style:--i={Math.min(i, 8)}
						>
							<a
								href="/reservations/{reservation.id}"
								class="flex flex-1 items-start gap-3 rounded-t-box p-4 transition-colors hover:bg-base-200/50"
							>
								<BusinessLogo src={reservation.logoUrl} priority={i < 4} />
								<div class="min-w-0 flex-1">
									<div class="flex items-start justify-between gap-2">
										<h2 class="truncate leading-snug font-extrabold">{reservation.offerName}</h2>
										{#if ready}
											<span class="badge shrink-0 gap-1 badge-sm badge-success">
												<span class="size-1.5 animate-pulse rounded-full bg-current"></span>
												Ready now
											</span>
										{:else}
											<StatusBadge
												map={RESERVATION_STATUS}
												status={reservation.status}
												class="shrink-0"
											/>
										{/if}
									</div>
									<p class="truncate text-sm text-base-content/60">
										{reservation.businessName}{#if reservation.city}
											· {reservation.city}{/if}
									</p>
									<p
										class="tabular mt-2 flex items-center gap-1.5 text-sm font-bold {reservation.status ===
										'active'
											? 'text-primary'
											: 'text-base-content/70'}"
									>
										<IconClock class="size-4 shrink-0" />
										{formatPickupWindow(reservation.pickupFrom, reservation.pickupUntil, now)}
									</p>
								</div>
							</a>

							<div
								class="flex min-h-12 items-center justify-between gap-2 border-t border-base-300/70 py-1 ps-4 pe-2"
							>
								<span class="tabular font-extrabold">
									{reservation.price === null
										? 'Donation'
										: formatPrice(reservation.price, reservation.currency)}
								</span>
								<div class="flex items-center">
									{#if !data.isCharity}
										<form
											method="POST"
											action="?/downloadReceipt"
											use:enhance={receiptSubmit(
												(pending) => (receiptPendingId = pending ? reservation.id : null)
											)}
										>
											<input type="hidden" name="reservationId" value={reservation.id} />
											<Button
												type="submit"
												variant="ghost"
												size="sm"
												icon={IconReceipt}
												class="min-h-11"
												loading={receiptPendingId === reservation.id}
												disabled={receiptPendingId !== null}
												aria-label="Download receipt for {reservation.offerName}"
											>
												Receipt
											</Button>
										</form>
									{/if}
									<Button
										href="/reservations/{reservation.id}"
										variant="ghost"
										size="sm"
										iconRight={IconChevron}
										class="min-h-11 text-primary"
									>
										{reservation.status === 'active' ? 'Ticket' : 'Details'}
									</Button>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/key}
</BaseLayout>
