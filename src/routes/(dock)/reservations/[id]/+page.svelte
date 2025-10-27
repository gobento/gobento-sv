<!-- /src/routes/(dock)/reservations/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconPersonAdd from '~icons/fluent/person-add-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-filled';
	import IconDismiss from '~icons/fluent/dismiss-circle-24-regular';
	import IconQrCode from '~icons/fluent/qr-code-24-regular';
	import IconFood from '~icons/fluent/food-24-regular';
	import IconShare from '~icons/fluent/share-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconTimer from '~icons/fluent/timer-24-regular';
	import IconChevronRight from '~icons/fluent/chevron-right-24-regular';

	import { formatDate, formatTime } from '$lib/util.js';
	import { onMount, onDestroy } from 'svelte';
	import CollectFoodModal from './CollectFoodModal.svelte';

	let { data, form } = $props();

	let showInviteModal = $state(false);
	let showCollectModal = $state(false);
	let inviteLoading = $state(false);
	let collectLoading = $state(false);
	let swipeProgress = $state(0);
	let isDragging = $state(false);
	let startX = $state(0);
	let inviteLink = $state('');
	let linkCopied = $state(false);

	// Countdown state
	let timeRemaining = $state({
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
		isPickupTime: false,
		hasStarted: false
	});
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	function calculateTimeRemaining() {
		const now = new Date();
		const pickupStart = new Date(data.reservation.pickupFrom);
		const pickupEnd = new Date(data.reservation.pickupUntil);

		if (now >= pickupStart && now <= pickupEnd) {
			timeRemaining.isPickupTime = true;
			timeRemaining.hasStarted = true;
			return;
		}

		if (now > pickupEnd) {
			timeRemaining.hasStarted = true;
			timeRemaining.isPickupTime = false;
			return;
		}

		const diff = pickupStart.getTime() - now.getTime();

		timeRemaining.days = Math.floor(diff / (1000 * 60 * 60 * 24));
		timeRemaining.hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		timeRemaining.minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		timeRemaining.seconds = Math.floor((diff % (1000 * 60)) / 1000);
		timeRemaining.hasStarted = false;
		timeRemaining.isPickupTime = false;
	}

	onMount(() => {
		calculateTimeRemaining();
		countdownInterval = setInterval(() => {
			const wasPickupTime = timeRemaining.isPickupTime;
			calculateTimeRemaining();
			if (!wasPickupTime && timeRemaining.isPickupTime) {
				sendPickupNotification();
			}
		}, 1000);
	});

	onDestroy(() => {
		if (countdownInterval) {
			clearInterval(countdownInterval);
		}
	});

	async function sendPickupNotification() {
		if (!browser) return;
		if ('Notification' in window && Notification.permission === 'granted') {
			new Notification('Pickup Time!', {
				body: `Your food is ready to pick up at ${data.business.name}`,
				icon: data.business.logo.url,
				badge: data.business.logo.url,
				tag: `pickup-${data.reservation.id}`,
				requireInteraction: true
			});
		}
		if ('vibrate' in navigator) {
			navigator.vibrate([200, 100, 200, 100, 200]);
		}
	}

	function requestNotificationPermission() {
		if (!browser) return;
		if ('Notification' in window && Notification.permission === 'default') {
			Notification.requestPermission();
		}
	}

	function handleSwipeStart(e: MouseEvent | TouchEvent) {
		isDragging = true;
		startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
	}

	function handleSwipeEnd() {
		if (swipeProgress >= 90) {
			handleCollect();
		} else {
			swipeProgress = 0;
		}
		isDragging = false;
	}

	async function handleCollect() {
		collectLoading = true;
		const formEl = document.getElementById('collectForm') as HTMLFormElement;
		if (formEl) {
			formEl.requestSubmit();
		}
	}

	function hapticFeedback(intensity: 'light' | 'medium' | 'heavy' = 'medium') {
		if (!browser) return;
		if ('vibrate' in navigator) {
			const patterns = {
				light: 10,
				medium: 20,
				heavy: [30, 10, 30]
			};
			navigator.vibrate(patterns[intensity]);
		}
	}

	function handleSwipeMove(e: MouseEvent | TouchEvent) {
		if (!isDragging) return;

		const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const diff = currentX - startX;
		const maxWidth = 300;
		const progress = Math.max(0, Math.min(100, (diff / maxWidth) * 100));

		if (progress >= 90 && swipeProgress < 90) {
			hapticFeedback('heavy');
		} else if (progress >= 50 && swipeProgress < 50) {
			hapticFeedback('light');
		}

		swipeProgress = progress;
	}

	async function copyInviteLink() {
		if (!browser) return;
		if (inviteLink) {
			try {
				await navigator.clipboard.writeText(inviteLink);
				linkCopied = true;
				hapticFeedback('medium');
				setTimeout(() => {
					linkCopied = false;
				}, 2000);
			} catch (err) {
				console.error('Failed to copy link:', err);
			}
		}
	}

	async function shareInviteLink() {
		if (!browser) return;
		if (inviteLink && navigator.share) {
			try {
				await navigator.share({
					title: `Collect ${data.offer.name}`,
					text: `I've invited you to collect this food from ${data.business.name}!`,
					url: inviteLink
				});
			} catch (err) {
				console.log('Share cancelled or not supported');
			}
		}
	}

	$effect(() => {
		if (form?.success && form?.inviteLink) {
			inviteLink = form.inviteLink;
		}

		if (form?.success && !collectLoading && !inviteLoading) {
			if (!form.inviteLink && !form.inviteAccepted && !form.inviteDeclined) {
				showInviteModal = false;
				showCollectModal = false;
			}
			swipeProgress = 0;
		}
	});

	const hasPendingInvite = $derived(
		data.isOwner && data.invites.some((inv) => inv.status === 'pending')
	);

	const canShare = $derived(
		browser && data.isOwner && typeof navigator !== 'undefined' && navigator.share !== undefined
	);
</script>

<svelte:window
	onmousemove={handleSwipeMove}
	onmouseup={handleSwipeEnd}
	ontouchmove={handleSwipeMove}
	ontouchend={handleSwipeEnd}
/>

<div class="mx-auto max-w-2xl space-y-6 p-4">
	<!-- Invite Accepted Banner -->
	{#if form?.inviteAccepted}
		<div class="rounded-2xl border-l-4 border-success bg-base-100 p-6 shadow-sm">
			<div class="flex items-center gap-4">
				<IconCheckmark class="h-12 w-12 text-success" />
				<div>
					<h2 class="text-xl font-bold text-success">Invite Accepted</h2>
					<p class="mt-1 text-sm text-base-content/60">You can now collect this food reservation</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Invite Declined Banner -->
	{#if form?.inviteDeclined}
		<div class="rounded-2xl border-l-4 border-base-300 bg-base-100 p-6 shadow-sm">
			<div class="flex items-center gap-4">
				<IconDismiss class="h-12 w-12 text-base-content/40" />
				<div>
					<h2 class="text-xl font-bold">Invite Declined</h2>
					<p class="mt-1 text-sm text-base-content/60">You've declined this invitation</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Countdown Timer -->
	{#if data.reservation.status === 'active' && !timeRemaining.hasStarted && !data.pendingInviteForUser}
		<div class="rounded-2xl border-l-4 border-primary bg-base-100 p-6 shadow-sm">
			<div class="mb-4 flex items-center gap-2">
				<IconTimer class="size-5 text-primary" />
				<h2 class="text-lg font-bold">Time Until Pickup</h2>
			</div>
			<div class="flex gap-3">
				{#if timeRemaining.days > 0}
					<div class="flex flex-1 flex-col items-center rounded-xl bg-base-200 p-4">
						<span class="text-3xl font-bold text-primary tabular-nums">{timeRemaining.days}</span>
						<span class="mt-1 text-xs tracking-wide text-base-content/50 uppercase">Days</span>
					</div>
				{/if}
				<div class="flex flex-1 flex-col items-center rounded-xl bg-base-200 p-4">
					<span class="text-3xl font-bold text-primary tabular-nums">{timeRemaining.hours}</span>
					<span class="mt-1 text-xs tracking-wide text-base-content/50 uppercase">Hours</span>
				</div>
				<div class="flex flex-1 flex-col items-center rounded-xl bg-base-200 p-4">
					<span class="text-3xl font-bold text-primary tabular-nums">{timeRemaining.minutes}</span>
					<span class="mt-1 text-xs tracking-wide text-base-content/50 uppercase">Mins</span>
				</div>
				<div class="flex flex-1 flex-col items-center rounded-xl bg-base-200 p-4">
					<span class="text-3xl font-bold text-primary tabular-nums">{timeRemaining.seconds}</span>
					<span class="mt-1 text-xs tracking-wide text-base-content/50 uppercase">Secs</span>
				</div>
			</div>
			{#if browser && 'Notification' in window && Notification.permission === 'default'}
				<button
					onclick={requestNotificationPermission}
					class="btn mt-4 w-full rounded-full btn-outline btn-sm btn-primary"
				>
					Enable Notifications
				</button>
			{/if}
		</div>
	{/if}

	<!-- Pickup Ready Banner -->
	{#if data.reservation.status === 'active' && timeRemaining.isPickupTime && !data.pendingInviteForUser}
		<div class="animate-pulse rounded-2xl border-l-4 border-warning bg-base-100 p-6 shadow-sm">
			<div class="flex items-center gap-4">
				<IconCheckmark class="h-12 w-12 text-warning" />
				<div>
					<h2 class="text-xl font-bold text-warning">Pickup Time!</h2>
					<p class="mt-1 text-sm text-base-content/60">Your food is ready to be picked up now</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Collected Banner -->
	{#if data.reservation.status === 'claimed'}
		<div class="rounded-2xl border-l-4 border-success bg-base-100 p-6 shadow-sm">
			<div class="flex items-center gap-4">
				<IconCheckmark class="h-12 w-12 text-success" />
				<div class="flex-1">
					<h2 class="text-xl font-bold text-success">Food Collected</h2>
					{#if data.reservation.claimedAt}
						<p class="mt-1 text-sm text-base-content/60">
							{formatDate(data.reservation.claimedAt)} at {formatTime(data.reservation.claimedAt)}
						</p>
					{/if}
					{#if data.reservation.claimedBy && data.isOwner}
						{@const claimer = data.invites.find((inv) => inv.userId === data.reservation.claimedBy)}
						{#if claimer}
							<div class="mt-3 flex items-center gap-2 rounded-xl bg-base-200 p-3">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm"
								>
									👤
								</div>
								<span class="text-sm font-medium">Collected by your friend</span>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Business Info -->
	<a
		href="/businesses/{data.business.accountId}"
		class="block rounded-2xl bg-base-100 p-6 shadow-sm transition-all hover:shadow-md"
	>
		<div class="flex items-start gap-4">
			<div class="h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
				<img
					src={data.business.logo.url}
					alt={data.business.name}
					class="h-full w-full object-cover"
				/>
			</div>
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<h2 class="truncate text-xl font-bold">{data.business.name}</h2>
					<IconChevronRight class="size-5 shrink-0 text-base-content/40" />
				</div>
				<p class="mt-1 text-xs text-base-content/40">{data.business.country}</p>
				<p class="mt-2 line-clamp-2 text-sm text-base-content/60">{data.business.description}</p>
			</div>
		</div>
	</a>

	<!-- Header Section -->
	<div class="rounded-2xl bg-base-100 p-6 shadow-sm">
		<div class="flex items-start gap-3">
			<IconFood class="mt-1 size-5 shrink-0 text-base-content/40" />
			<div class="min-w-0 flex-1">
				<h1 class="text-2xl font-bold">{data.offer.name}</h1>
				<p class="mt-2 text-base-content/60">{data.offer.description}</p>
			</div>
			<div class="shrink-0 text-right">
				<div class="text-2xl font-bold text-primary tabular-nums">
					{data.offer.price.toFixed(2)}
				</div>
				<div class="text-xs text-base-content/40">{data.offer.currency}</div>
			</div>
		</div>
	</div>

	<!-- Pickup Information -->
	<div class="rounded-2xl bg-base-100 p-6 shadow-sm">
		<div class="mb-6 flex items-center gap-2">
			<IconCalendar class="size-5 text-base-content/60" />
			<h2 class="text-lg font-bold">Pickup Details</h2>
		</div>

		<div class="space-y-6">
			<div class="grid grid-cols-2 gap-4">
				<div>
					<div
						class="mb-2 flex items-center gap-1 text-xs tracking-wide text-base-content/40 uppercase"
					>
						<IconCalendar class="h-3 w-3" />
						Date
					</div>
					<p class="font-medium">{formatDate(data.reservation.pickupFrom)}</p>
				</div>
				<div>
					<div
						class="mb-2 flex items-center gap-1 text-xs tracking-wide text-base-content/40 uppercase"
					>
						<IconClock class="h-3 w-3" />
						Time
					</div>
					<p class="font-medium tabular-nums">
						{formatTime(data.reservation.pickupFrom)}–{formatTime(data.reservation.pickupUntil)}
					</p>
				</div>
			</div>

			{#if data.location}
				<a
					href="/locations/{data.location.id}"
					class="flex items-start gap-3 rounded-xl bg-base-200 p-4 transition-colors hover:bg-base-300"
				>
					<IconLocation class="mt-0.5 size-5 shrink-0 text-base-content/60" />
					<div class="min-w-0 flex-1">
						<p class="font-medium">{data.location.name}</p>
						<p class="mt-1 text-sm text-base-content/60">
							{data.location.address}<br />
							{data.location.city}, {data.location.zipCode}<br />
							{data.location.country}
						</p>
					</div>
					<IconChevronRight class="mt-0.5 size-5 shrink-0 text-base-content/40" />
				</a>
			{:else}
				<div class="flex items-center gap-3 rounded-xl bg-base-200 p-4 text-base-content/60">
					<IconLocation class="size-5" />
					<span>Location details not specified</span>
				</div>
			{/if}

			{#if data.reservation.notes}
				<div class="rounded-xl bg-base-200 p-4">
					<p class="mb-2 text-xs tracking-wide text-base-content/40 uppercase">Your Notes</p>
					<p class="text-sm">{data.reservation.notes}</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Invite to Collection Section -->
	{#if data.isOwner && data.reservation.status === 'active'}
		<div class="rounded-2xl bg-base-100 p-6 shadow-sm">
			<div class="mb-4 flex items-center gap-2">
				<IconShare class="size-5 text-base-content/60" />
				<h2 class="text-lg font-bold">Pass to Friend</h2>
			</div>

			{#if hasPendingInvite}
				{@const pendingInvite = data.invites.find((inv) => inv.status === 'pending')}
				<div class="mb-4 rounded-xl border-l-4 border-warning bg-base-100 p-4">
					<p class="font-medium text-warning">Invite Link Active</p>
					<p class="mt-2 text-sm text-base-content/60">
						Share this link with a friend to let them collect this food
					</p>
					<div class="mt-3 rounded-lg bg-base-200 p-3 font-mono text-xs break-all">
						{$page.url.origin}/reservations/{data.reservation
							.id}?invite={pendingInvite?.inviteToken}
					</div>
					<div class="mt-3 flex gap-2">
						<button
							onclick={() => {
								inviteLink = `${$page.url.origin}/reservations/${data.reservation.id}?invite=${pendingInvite?.inviteToken}`;
								copyInviteLink();
							}}
							class="btn flex-1 gap-2 rounded-full btn-sm"
						>
							<IconCopy class="h-4 w-4" />
							{linkCopied ? 'Copied!' : 'Copy Link'}
						</button>
						{#if canShare}
							<button
								onclick={() => {
									inviteLink = `${$page.url.origin}/reservations/${data.reservation.id}?invite=${pendingInvite?.inviteToken}`;
									shareInviteLink();
								}}
								class="btn flex-1 gap-2 rounded-full btn-sm btn-primary"
							>
								<IconShare class="h-4 w-4" />
								Share
							</button>
						{/if}
					</div>
				</div>
				<form method="POST" action="?/cancelInvite" use:enhance>
					<button type="submit" class="btn btn-block gap-2 rounded-full btn-ghost btn-sm">
						<IconDismiss class="h-4 w-4" />
						Cancel Invite
					</button>
				</form>
			{:else if data.invites.length > 0 && data.invites[0].status === 'accepted'}
				<div class="rounded-xl border-l-4 border-success bg-base-100 p-4">
					<p class="font-medium text-success">Invite Accepted</p>
					<p class="mt-1 text-sm text-base-content/60">Your friend can now collect this food</p>
				</div>
			{:else}
				<p class="mb-4 text-sm text-base-content/60">
					Can't make it? Let a friend collect this food instead!
				</p>
				<button
					onclick={() => (showInviteModal = true)}
					class="btn btn-block gap-2 rounded-full btn-primary"
				>
					<IconShare class="h-4 w-4" />
					Create Invite Link
				</button>
			{/if}
		</div>
	{/if}

	<!-- Pending Invite (for invited user via link) -->
	{#if data.pendingInviteForUser}
		<div class="rounded-2xl border-l-4 border-primary bg-base-100 p-6 shadow-sm">
			<div class="mb-6 text-center">
				<IconPersonAdd class="mx-auto mb-4 h-16 w-16 text-primary" />
				<h2 class="text-2xl font-bold text-primary">You've Been Invited</h2>
				<p class="mt-2 text-sm text-base-content/60">
					Someone wants to pass this food collection to you
				</p>
			</div>

			<div class="mb-6 space-y-4 rounded-xl bg-base-200 p-4">
				<div>
					<p class="mb-1 text-xs tracking-wide text-base-content/40 uppercase">Offer</p>
					<p class="font-medium">{data.offer.name}</p>
				</div>
				<div>
					<p class="mb-1 text-xs tracking-wide text-base-content/40 uppercase">Pickup Time</p>
					<p class="text-sm tabular-nums">
						{formatDate(data.reservation.pickupFrom)} • {formatTime(
							data.reservation.pickupFrom
						)}–{formatTime(data.reservation.pickupUntil)}
					</p>
				</div>
				<div>
					<p class="mb-1 text-xs tracking-wide text-base-content/40 uppercase">Location</p>
					<p class="text-sm">{data.business.name}</p>
					{#if data.location}
						<p class="text-xs text-base-content/60">
							{data.location.address}, {data.location.city}
						</p>
					{/if}
				</div>
			</div>

			{#if form?.error}
				<div class="mb-4 rounded-xl border-l-4 border-error bg-base-100 p-4">
					<div class="flex items-center gap-2 text-error">
						<IconDismiss class="size-5" />
						<span>{form.error}</span>
					</div>
				</div>
			{/if}

			<div class="flex gap-3">
				<form
					method="POST"
					action="?/declineInvite&invite={$page.url.searchParams.get('invite')}"
					use:enhance
					class="flex-1"
				>
					<button type="submit" class="btn btn-block gap-2 rounded-full btn-ghost">
						<IconDismiss class="size-5" />
						Decline
					</button>
				</form>
				<form
					method="POST"
					action="?/acceptInvite&invite={$page.url.searchParams.get('invite')}"
					use:enhance
					class="flex-1"
				>
					<button type="submit" class="btn btn-block gap-2 rounded-full btn-lg btn-primary">
						<IconCheckmark class="size-5" />
						Accept
					</button>
				</form>
			</div>
		</div>
	{:else}
		<!-- Action Buttons -->
		{#if data.reservation.status === 'active' && (data.isOwner || data.userInvite?.status === 'accepted')}
			<button
				onclick={() => (showCollectModal = true)}
				class="btn btn-block gap-2 rounded-full shadow-lg btn-lg btn-success"
			>
				<IconCheckmark class="size-5" />
				Collect Food
			</button>
		{/if}

		<!-- Create Invite Modal -->
		{#if showInviteModal}
			<div class="modal-open modal">
				<div class="modal-box rounded-3xl">
					<button
						onclick={() => {
							showInviteModal = false;
							inviteLink = '';
							linkCopied = false;
						}}
						class="btn absolute top-4 right-4 btn-circle btn-ghost btn-sm"
					>
						✕
					</button>
					<h3 class="mb-6 text-xl font-bold">Invite to Collection</h3>

					{#if form?.error}
						<div class="mb-4 rounded-xl border-l-4 border-error bg-base-100 p-4">
							<div class="flex items-center gap-2 text-error">
								<IconDismiss class="size-5" />
								<span>{form.error}</span>
							</div>
						</div>
					{/if}

					{#if inviteLink}
						<div class="mb-4 rounded-xl border-l-4 border-success bg-base-100 p-4">
							<div class="flex items-center gap-2 text-success">
								<IconCheckmark class="size-5" />
								<span class="font-medium">Invite link created!</span>
							</div>
						</div>

						<div class="mb-6">
							<label class="mb-2 block font-medium">Share this link</label>
							<div class="flex gap-2">
								<input
									type="text"
									value={inviteLink}
									readonly
									class="input-bordered input flex-1 rounded-xl font-mono text-xs"
								/>
								<button onclick={copyInviteLink} class="btn btn-square rounded-xl">
									<IconCopy class="size-5" />
								</button>
							</div>
							{#if linkCopied}
								<p class="mt-2 text-sm text-success">Link copied to clipboard!</p>
							{/if}
						</div>

						{#if canShare}
							<button
								onclick={shareInviteLink}
								class="btn mb-4 btn-block gap-2 rounded-full btn-primary"
							>
								<IconShare class="size-5" />
								Share via...
							</button>
						{/if}

						<button
							onclick={() => {
								showInviteModal = false;
								inviteLink = '';
								linkCopied = false;
							}}
							class="btn btn-block rounded-full"
						>
							Done
						</button>
					{:else}
						<p class="mb-6 text-sm text-base-content/60">
							Create a shareable link that allows one person to collect this food reservation on
							your behalf.
						</p>

						<div class="mb-6 rounded-xl border-l-4 border-warning bg-base-100 p-4">
							<p class="text-sm text-base-content/60">
								⚠️ Only one person can use this invite. Once accepted, they'll be able to collect
								the food.
							</p>
						</div>

						<form
							method="POST"
							action="?/createInvite"
							use:enhance={() => {
								inviteLoading = true;
								return async ({ update }) => {
									await update();
									inviteLoading = false;
								};
							}}
						>
							<div class="flex gap-3">
								<button
									type="button"
									onclick={() => (showInviteModal = false)}
									class="btn flex-1 rounded-full btn-ghost"
									disabled={inviteLoading}
								>
									Cancel
								</button>
								<button
									type="submit"
									class="btn flex-1 rounded-full btn-primary"
									disabled={inviteLoading}
								>
									{#if inviteLoading}
										<span class="loading loading-spinner"></span>
									{/if}
									Create Link
								</button>
							</div>
						</form>
					{/if}
				</div>
				<div
					class="modal-backdrop"
					onclick={() => {
						showInviteModal = false;
						inviteLink = '';
						linkCopied = false;
					}}
				></div>
			</div>
		{/if}

		<CollectFoodModal bind:open={showCollectModal} claimToken={data.reservation.claimToken} />
	{/if}
</div>
