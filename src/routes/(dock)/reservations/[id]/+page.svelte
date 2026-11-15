<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import { slide } from 'svelte/transition';

	import IconBack from '~icons/fluent/chevron-left-24-regular';
	import IconChevronRight from '~icons/fluent/chevron-right-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconDirections from '~icons/fluent/arrow-turn-right-24-regular';
	import IconMap from '~icons/fluent/map-24-regular';
	import IconPersonAdd from '~icons/fluent/person-add-24-regular';
	import IconPeople from '~icons/fluent/people-24-regular';
	import IconBag from '~icons/fluent/shopping-bag-24-filled';
	import IconReceipt from '~icons/fluent/receipt-24-regular';
	import IconAlert from '~icons/fluent/alert-24-regular';
	import IconTimerOff from '~icons/fluent/timer-off-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconNote from '~icons/fluent/note-24-regular';

	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import IconTile from '#lib/components/ui/IconTile.svelte';
	import StatusBadge from '#lib/components/ui/StatusBadge.svelte';
	import SuccessCheck from '#lib/components/ui/SuccessCheck.svelte';
	import Confetti from '#lib/components/motion/Confetti.svelte';
	import { toast } from '#lib/components/ui/toast.svelte';
	import BusinessLogo from '#lib/components/reservations/BusinessLogo.svelte';
	import {
		countdownTo,
		formatClock,
		formatMoment,
		formatPickupWindow,
		pickupPhase
	} from '#lib/components/reservations/pickup.js';
	import { receiptSubmit } from '#lib/components/reservations/receipt.js';
	import {
		cancelPickupNotifications,
		notificationPermission,
		requestNotificationPermission,
		schedulePickupNotifications
	} from '#lib/client/schedulePickupNotifications.js';
	import { RESERVATION_STATUS } from '#lib/statuses.js';
	import { formatPrice } from '#lib/util.js';

	import CollectFoodModal from './CollectFoodModal.svelte';
	import CreateInviteModal from './CreateInviteModal.svelte';

	let { data } = $props();

	let showInviteModal = $state(false);
	let showCollectModal = $state(false);
	let showMap = $state(false);
	let receiptPending = $state(false);
	let invitePending = $state<'accept' | 'decline' | 'cancel' | null>(null);
	let justPaid = $state(false);
	let confetti = $state(false);
	let canAskForReminder = $state(false);
	let now = $state(Date.now());

	const reservation = $derived(data.reservation);
	const isActive = $derived(reservation.status === 'active');
	const isCollected = $derived(reservation.status === 'claimed' || reservation.status === 'completed');
	const phase = $derived(pickupPhase(reservation.pickupFrom, reservation.pickupUntil, now));
	const countdown = $derived(
		countdownTo(phase === 'upcoming' ? reservation.pickupFrom : reservation.pickupUntil, now)
	);
	const pickupWindow = $derived(
		formatPickupWindow(reservation.pickupFrom, reservation.pickupUntil, now)
	);
	const collectedAt = $derived(reservation.claimedAt ?? reservation.completedAt);

	const handedToFriend = $derived(data.invite?.status === 'accepted');
	const canCollectNow = $derived(
		isActive && phase === 'open' && data.canCollect && !handedToFriend && !!reservation.claimToken
	);
	const inviteLink = $derived(
		data.invite?.token
			? `${page.url.origin}/reservations/${reservation.id}?invite=${data.invite.token}`
			: null
	);
	const inviteQuery = $derived(
		`&invite=${encodeURIComponent(page.url.searchParams.get('invite') ?? '')}`
	);
	const directionsHref = $derived(
		data.location
			? `https://www.google.com/maps/dir/?api=1&destination=${data.location.latitude},${data.location.longitude}`
			: null
	);

	async function celebrate() {
		confetti = false;
		await tick();
		confetti = true;
	}

	onMount(() => {
		canAskForReminder = notificationPermission() === 'default';

		if (page.url.searchParams.get('success') === 'true') {
			justPaid = true;
			celebrate();
			// Drop the flag so a reload or shared link does not celebrate again.
			const url = new URL(page.url.href);
			url.searchParams.delete('success');
			tick().then(() => {
				try {
					replaceState(url, page.state);
				} catch {
					// The router is not ready yet; the flag simply stays in the URL.
				}
			});
		}
	});

	// One tick per second while the pickup is still ahead or under way.
	$effect(() => {
		if (!isActive) return;
		now = Date.now();
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	let lastPhase: typeof phase | null = null;
	$effect(() => {
		const current = phase;
		const previous = lastPhase;
		lastPhase = current;
		if (!isActive || previous === null || previous === current) return;

		if (current === 'open') {
			navigator.vibrate?.([200, 100, 200]);
			if (data.canCollect) toast.success('Your food is ready for pickup');
		} else if (current === 'closed') {
			// Lets the server settle the reservation as expired.
			invalidateAll();
		}
	});

	async function enableReminders() {
		const granted = await requestNotificationPermission();
		canAskForReminder = false;
		if (!granted) {
			toast.info('Notifications are blocked. You can allow them in your browser settings.');
			return;
		}
		const result = await schedulePickupNotifications({
			reservationId: reservation.id,
			pickupDate: reservation.pickupFrom,
			offerName: data.offer.name,
			locationName: data.business.name
		});
		toast.success(
			result.success
				? 'We will remind you before pickup'
				: 'Notifications are on. Keep this page open to be reminded.'
		);
	}

	function onCollected() {
		celebrate();
		toast.success('Enjoy your food!');
		cancelPickupNotifications(reservation.id).catch(() => {});
	}

	function reportFailure(result: { type: string; data?: Record<string, unknown> }, fallback: string) {
		if (result.type === 'failure' || result.type === 'error') {
			const message = result.data?.error;
			toast.error(typeof message === 'string' ? message : fallback);
		}
	}
</script>

<svelte:head>
	<title>{data.offer.name} · {data.business.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<Confetti show={confetti} />

{#snippet countdownCells()}
	<div class="tabular flex items-start justify-center gap-1.5 text-center" role="timer">
		{#each [...(countdown.days > 0 ? [{ value: String(countdown.days), unit: countdown.days === 1 ? 'day' : 'days' }] : []), { value: countdown.hours, unit: 'hrs' }, { value: countdown.minutes, unit: 'min' }, { value: countdown.seconds, unit: 'sec' }] as cell, i (cell.unit)}
			{#if i > 0}
				<span class="pt-2.5 text-2xl font-extrabold opacity-30" aria-hidden="true">:</span>
			{/if}
			<div class="w-16">
				<div class="rounded-2xl bg-base-100 py-2.5 text-3xl leading-none font-extrabold shadow-soft">
					{cell.value}
				</div>
				<div class="mt-1.5 text-[11px] font-bold tracking-wider text-base-content/50 uppercase">
					{cell.unit}
				</div>
			</div>
		{/each}
	</div>
{/snippet}

<div class="page-narrow space-y-4 {canCollectNow ? 'pb-28 md:pb-10' : ''}">
	<a
		href="/reservations"
		class="-ms-2 inline-flex items-center gap-0.5 rounded-full py-1 ps-1 pe-3 text-sm font-bold text-base-content/60 transition-colors hover:bg-base-300/50 hover:text-base-content"
	>
		<IconBack class="size-5 rtl:rotate-180" />
		Orders
	</a>

	{#if justPaid}
		<div class="surface flex animate-rise-in items-center gap-4 p-4" role="status">
			<SuccessCheck size="md" />
			<div class="min-w-0">
				<p class="font-extrabold">Payment complete</p>
				<p class="text-sm text-base-content/70">
					Your bag is reserved. This page is your pickup ticket.
				</p>
			</div>
		</div>
	{/if}

	{#if data.hasPendingInvite}
		<section class="surface animate-rise-in p-5 text-center">
			<IconTile icon={IconPersonAdd} size="xl" class="mx-auto animate-float" />
			<h1 class="mt-4 text-2xl font-extrabold tracking-tight">You have been invited</h1>
			<p class="mt-1 text-base-content/70">
				A friend would like you to collect this bag for them. It is already paid for.
			</p>
			<div class="mt-5 grid grid-cols-2 gap-3">
				<form
					method="POST"
					action="?/declineInvite{inviteQuery}"
					use:enhance={() => {
						invitePending = 'decline';
						return async ({ result, update }) => {
							if (result.type === 'redirect') toast.info('Invite declined');
							reportFailure(result, 'Could not decline the invite');
							await update();
							invitePending = null;
						};
					}}
				>
					<Button
						type="submit"
						variant="ghost"
						block
						loading={invitePending === 'decline'}
						disabled={invitePending !== null}
					>
						Decline
					</Button>
				</form>
				<form
					method="POST"
					action="?/acceptInvite{inviteQuery}"
					use:enhance={() => {
						invitePending = 'accept';
						return async ({ result, update }) => {
							if (result.type === 'success') toast.success('Invite accepted. The pickup is yours.');
							reportFailure(result, 'Could not accept the invite');
							await update();
							invitePending = null;
						};
					}}
				>
					<Button
						type="submit"
						block
						loading={invitePending === 'accept'}
						disabled={invitePending !== null}
					>
						Accept
					</Button>
				</form>
			</div>
		</section>
	{/if}

	<!-- The ticket -->
	<article class="surface animate-rise-in overflow-hidden">
		{#if isCollected}
			<div class="flex flex-col items-center gap-3 bg-success/10 px-5 py-7 text-center">
				<SuccessCheck size="md" />
				<div>
					<p class="text-2xl font-extrabold tracking-tight">Collected</p>
					{#if collectedAt}
						<p class="tabular mt-0.5 text-sm text-base-content/70">{formatMoment(collectedAt)}</p>
					{/if}
					{#if reservation.collectedByFriend}
						<p class="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-success">
							<IconPeople class="size-4" /> Picked up by your friend
						</p>
					{/if}
				</div>
			</div>
		{:else if reservation.status === 'expired' || phase === 'closed'}
			<div class="flex flex-col items-center gap-3 bg-base-200/70 px-5 py-7 text-center">
				<IconTile icon={IconTimerOff} tone="muted" size="lg" class="bg-base-300/60" />
				<div>
					<p class="text-2xl font-extrabold tracking-tight">Pickup window closed</p>
					<p class="mt-0.5 text-sm text-base-content/70">
						This bag was not collected in time and can no longer be handed out.
					</p>
				</div>
				<Button href="/discover" variant="neutral" outline size="sm" icon={IconSearch} class="min-h-11">
					Find another bag
				</Button>
			</div>
		{:else if phase === 'open'}
			<div class="bg-success/10 px-5 py-6 text-center">
				<p class="inline-flex items-center gap-2 text-sm font-extrabold text-success">
					<span class="relative flex size-2.5">
						<span class="absolute inline-flex size-full animate-ping rounded-full bg-success/60"></span>
						<span class="relative inline-flex size-2.5 rounded-full bg-success"></span>
					</span>
					Pickup is open
				</p>
				<p class="mt-1 text-2xl font-extrabold tracking-tight">Ready for pickup now</p>
				<p class="tabular mt-1 text-sm text-base-content/70">
					Closes at {formatClock(reservation.pickupUntil)} · in
					<span class="font-bold text-base-content">
						{#if countdown.days > 0}{countdown.days}d
						{/if}{countdown.hours}:{countdown.minutes}:{countdown.seconds}
					</span>
				</p>
				{#if handedToFriend}
					<p class="mt-3 text-sm font-bold text-base-content/70">Your friend is collecting this bag.</p>
				{/if}
			</div>
		{:else}
			<div class="bg-primary/8 px-5 py-6 text-center">
				<p class="eyebrow mb-3 text-primary">Pickup opens in</p>
				{@render countdownCells()}
				{#if canAskForReminder && data.canCollect}
					<Button
						variant="ghost"
						size="sm"
						icon={IconAlert}
						class="mt-4 min-h-11 text-primary"
						onclick={enableReminders}
					>
						Remind me before pickup
					</Button>
				{/if}
			</div>
		{/if}

		<!-- Perforation between the status stub and the ticket body -->
		<div class="relative h-0 border-t-2 border-dashed border-base-300" aria-hidden="true">
			<span
				class="absolute -start-3 -top-3 size-6 rounded-full border border-base-300/70 bg-base-200"
			></span>
			<span class="absolute -end-3 -top-3 size-6 rounded-full border border-base-300/70 bg-base-200"
			></span>
		</div>

		<div class="space-y-4 p-5">
			<div class="flex items-start gap-3">
				<BusinessLogo src={data.business.logoUrl} size="lg" priority />
				<div class="min-w-0 flex-1">
					<h1 class="text-xl leading-tight font-extrabold tracking-tight">{data.offer.name}</h1>
					<a
						href="/businesses/{data.business.accountId}"
						class="mt-0.5 inline-flex max-w-full items-center gap-0.5 text-sm font-bold text-base-content/60 hover:text-primary"
					>
						<span class="truncate">{data.business.name}</span>
						<IconChevronRight class="size-4 shrink-0 rtl:rotate-180" />
					</a>
				</div>
				<StatusBadge map={RESERVATION_STATUS} status={reservation.status} class="mt-1 shrink-0" />
			</div>

			<dl class="grid grid-cols-2 gap-3 text-sm">
				<div class="rounded-2xl bg-base-200/60 p-3">
					<dt class="flex items-center gap-1.5 text-xs font-bold text-base-content/55">
						<IconClock class="size-4" /> Pickup
					</dt>
					<dd class="tabular mt-1 font-extrabold">{pickupWindow}</dd>
				</div>
				<div class="rounded-2xl bg-base-200/60 p-3">
					<dt class="flex items-center gap-1.5 text-xs font-bold text-base-content/55">
						<IconBag class="size-4" />
						{data.offer.price === null ? 'Order' : 'Paid'}
					</dt>
					<dd class="tabular mt-1 font-extrabold">
						{#if data.offer.price !== null}
							{formatPrice(data.offer.price, data.offer.currency)}
						{:else if data.isOwner}
							Donation
						{:else}
							Paid by your friend
						{/if}
					</dd>
				</div>
			</dl>

			{#if data.offer.description}
				<p class="text-sm text-base-content/70">{data.offer.description}</p>
			{/if}

			{#if canCollectNow}
				<div
					class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[1000] border-t border-base-300/70 bg-base-100/90 px-4 py-3 backdrop-blur-xl md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
				>
					<Button
						variant="success"
						block
						size="lg"
						icon={IconBag}
						onclick={() => {
							navigator.vibrate?.(20);
							showCollectModal = true;
						}}
					>
						Collect food now
					</Button>
				</div>
			{/if}
		</div>
	</article>

	<!-- Where to go -->
	<section class="surface overflow-hidden" aria-labelledby="location-heading">
		{#if data.location}
			{#if data.location.imageUrl}
				<div class="aspect-[5/2] bg-base-200">
					<img
						src={data.location.imageUrl}
						alt=""
						loading="lazy"
						decoding="async"
						class="size-full object-cover"
					/>
				</div>
			{/if}
			<div class="space-y-4 p-5">
				<div class="flex items-start gap-3">
					<IconTile icon={IconLocation} />
					<div class="min-w-0 flex-1">
						<h2 id="location-heading" class="font-extrabold">{data.location.name}</h2>
						<p class="text-sm text-base-content/70">
							{data.location.address}, {data.location.zipCode}
							{data.location.city}
						</p>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-2">
					<Button
						href={directionsHref ?? undefined}
						target="_blank"
						rel="noopener noreferrer"
						variant="neutral"
						outline
						icon={IconDirections}
					>
						Directions
					</Button>
					<Button
						variant="ghost"
						icon={IconMap}
						aria-expanded={showMap}
						onclick={() => (showMap = !showMap)}
					>
						{showMap ? 'Hide map' : 'Show map'}
					</Button>
				</div>
				{#if showMap}
					<div class="h-64 overflow-hidden rounded-2xl bg-base-200" transition:slide={{ duration: 250 }}>
						{#await import('#lib/components/maps/MarkedMap.svelte')}
							<div class="skeleton-shimmer size-full"></div>
						{:then { default: MarkedMap }}
							<MarkedMap latitude={data.location.latitude} longitude={data.location.longitude} />
						{:catch}
							<p class="flex size-full items-center justify-center text-sm text-base-content/60">
								The map could not be loaded.
							</p>
						{/await}
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex items-center gap-3 p-5">
				<IconTile icon={IconLocation} tone="muted" />
				<div>
					<h2 id="location-heading" class="font-extrabold">Pickup location</h2>
					<p class="text-sm text-base-content/70">
						Ask {data.business.name} where to collect your bag.
					</p>
				</div>
			</div>
		{/if}
	</section>

	{#if reservation.notes}
		<section class="surface flex items-start gap-3 p-5">
			<IconTile icon={IconNote} tone="muted" />
			<div class="min-w-0">
				<h2 class="font-extrabold">Your note</h2>
				<p class="text-sm break-words text-base-content/70">{reservation.notes}</p>
			</div>
		</section>
	{/if}

	{#if data.isOwner && isActive && phase !== 'closed'}
		<section class="surface space-y-4 p-5">
			<div class="flex items-start gap-3">
				<IconTile icon={IconPeople} tone="secondary" />
				<div class="min-w-0 flex-1">
					<h2 class="font-extrabold">
						{#if handedToFriend}A friend is collecting this{:else if data.invite}Invite link is
							active{:else}Can't make it in time?{/if}
					</h2>
					<p class="text-sm text-base-content/70">
						{#if handedToFriend}
							Your friend accepted the invite. Cancel it if you want to collect the bag yourself.
						{:else if data.invite}
							Waiting for your friend to accept. The link works for one person.
						{:else}
							Let a friend collect the bag for you with a one-time link.
						{/if}
					</p>
				</div>
			</div>

			{#if data.invite}
				<div class="grid gap-2 {inviteLink ? 'grid-cols-2' : ''}">
					{#if inviteLink}
						<Button variant="neutral" outline onclick={() => (showInviteModal = true)}>
							Show link
						</Button>
					{/if}
					<form
						method="POST"
						action="?/cancelInvite"
						use:enhance={() => {
							invitePending = 'cancel';
							return async ({ result, update }) => {
								if (result.type === 'success') toast.success('Invite cancelled');
								reportFailure(result, 'Could not cancel the invite');
								await update();
								invitePending = null;
							};
						}}
					>
						<Button
							type="submit"
							variant="error"
							outline
							block
							loading={invitePending === 'cancel'}
						>
							Cancel invite
						</Button>
					</form>
				</div>
			{:else}
				<Button
					variant="neutral"
					outline
					block
					icon={IconPersonAdd}
					onclick={() => (showInviteModal = true)}
				>
					Pass to a friend
				</Button>
			{/if}
		</section>
	{/if}

	{#if data.canDownloadReceipt}
		<section class="surface flex items-center gap-3 p-4 ps-5">
			<IconTile icon={IconReceipt} tone="muted" />
			<div class="min-w-0 flex-1">
				<h2 class="font-extrabold">Receipt</h2>
				<p class="tabular text-sm text-base-content/70">
					Ordered {formatMoment(reservation.reservedAt, now)}
				</p>
			</div>
			<form
				method="POST"
				action="?/downloadReceipt"
				use:enhance={receiptSubmit((pending) => (receiptPending = pending))}
			>
				<Button
					type="submit"
					variant="ghost"
					class="text-primary"
					loading={receiptPending}
					loadingLabel="Creating…"
				>
					Download PDF
				</Button>
			</form>
		</section>
	{/if}
</div>

{#if data.isOwner}
	<CreateInviteModal
		bind:open={showInviteModal}
		{inviteLink}
		offerName={data.offer.name}
		businessName={data.business.name}
	/>
{/if}

{#if reservation.claimToken}
	<CollectFoodModal
		bind:open={showCollectModal}
		claimToken={reservation.claimToken}
		offerName={data.offer.name}
		businessName={data.business.name}
		oncollected={onCollected}
	/>
{/if}
