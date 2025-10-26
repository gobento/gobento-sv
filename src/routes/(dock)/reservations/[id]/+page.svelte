<!-- /src/routes/(dock)/reservations/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconPersonAdd from '~icons/fluent/person-add-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-filled';
	import IconDismiss from '~icons/fluent/dismiss-circle-24-regular';
	import IconQrCode from '~icons/fluent/qr-code-24-regular';
	import IconFood from '~icons/fluent/food-24-regular';
	import IconBuilding from '~icons/fluent/building-24-regular';
	import IconShare from '~icons/fluent/share-24-regular';
	import IconCancel from '~icons/fluent/delete-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconTimer from '~icons/fluent/timer-24-regular';
	import { formatDate, formatTime } from '$lib/util.js';
	import { onMount, onDestroy } from 'svelte';

	let { data, form } = $props();

	let showInviteModal = $state(false);
	let showClaimModal = $state(false);
	let inviteLoading = $state(false);
	let claimLoading = $state(false);
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

		// Check if we're in the pickup window
		if (now >= pickupStart && now <= pickupEnd) {
			timeRemaining.isPickupTime = true;
			timeRemaining.hasStarted = true;
			return;
		}

		// Check if pickup has passed
		if (now > pickupEnd) {
			timeRemaining.hasStarted = true;
			timeRemaining.isPickupTime = false;
			return;
		}

		// Calculate time until pickup starts
		const diff = pickupStart.getTime() - now.getTime();

		timeRemaining.days = Math.floor(diff / (1000 * 60 * 60 * 24));
		timeRemaining.hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		timeRemaining.minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		timeRemaining.seconds = Math.floor((diff % (1000 * 60)) / 1000);
		timeRemaining.hasStarted = false;
		timeRemaining.isPickupTime = false;
	}

	onMount(() => {
		// Initial calculation
		calculateTimeRemaining();

		// Update every second
		countdownInterval = setInterval(() => {
			const wasPickupTime = timeRemaining.isPickupTime;
			calculateTimeRemaining();

			// If pickup time just started, trigger notification
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
		// Send browser notification if permitted
		if ('Notification' in window && Notification.permission === 'granted') {
			new Notification('Pickup Time!', {
				body: `Your food is ready to pick up at ${data.business.name}`,
				icon: data.business.logo.url,
				badge: data.business.logo.url,
				tag: `pickup-${data.reservation.id}`,
				requireInteraction: true
			});
		}

		// Vibrate if supported
		if ('vibrate' in navigator) {
			navigator.vibrate([200, 100, 200, 100, 200]);
		}
	}

	function requestNotificationPermission() {
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
			handleClaim();
		} else {
			swipeProgress = 0;
		}
		isDragging = false;
	}

	async function handleClaim() {
		claimLoading = true;
		const formEl = document.getElementById('claimForm') as HTMLFormElement;
		if (formEl) {
			formEl.requestSubmit();
		}
	}

	function hapticFeedback(intensity: 'light' | 'medium' | 'heavy' = 'medium') {
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

		if (form?.success && !claimLoading && !inviteLoading) {
			if (!form.inviteLink && !form.inviteAccepted && !form.inviteDeclined) {
				showInviteModal = false;
				showClaimModal = false;
			}
			swipeProgress = 0;
		}
	});

	const hasPendingInvite = $derived(
		data.isOwner && data.invites.some((inv) => inv.status === 'pending')
	);

	const canShare = $derived(data.isOwner && navigator.share !== undefined);
</script>

<svelte:window
	onmousemove={handleSwipeMove}
	onmouseup={handleSwipeEnd}
	ontouchmove={handleSwipeMove}
	ontouchend={handleSwipeEnd}
/>

<!-- Invite Accepted Banner -->
{#if form?.inviteAccepted}
	<div class="mb-4 border-4 border-success bg-success/10 p-6 text-center">
		<IconCheckmark class="mx-auto mb-3 h-16 w-16 text-success" />
		<h2 class="mb-2 text-2xl font-bold text-success">Invite Accepted!</h2>
		<p class="text-sm text-base-content/70">You can now claim this food reservation</p>
	</div>
{/if}

<!-- Invite Declined Banner -->
{#if form?.inviteDeclined}
	<div class="mb-4 border-4 border-base-300 bg-base-200 p-6 text-center">
		<IconDismiss class="mx-auto mb-3 h-16 w-16 text-base-content/60" />
		<h2 class="mb-2 text-2xl font-bold">Invite Declined</h2>
		<p class="text-sm text-base-content/70">You've declined this invitation</p>
	</div>
{/if}

<!-- Countdown Timer -->
{#if data.reservation.status === 'active' && !timeRemaining.hasStarted && !data.pendingInviteForUser}
	<div class="mb-4 rounded-lg border-2 border-primary bg-primary/10 p-6">
		<div class="mb-3 flex items-center justify-center gap-2">
			<IconTimer class="h-6 w-6 text-primary" />
			<h2 class="text-xl font-bold text-primary">Time Until Pickup</h2>
		</div>
		<div class="flex justify-center gap-2">
			{#if timeRemaining.days > 0}
				<div class="flex min-w-[70px] flex-col items-center rounded-lg bg-base-100 p-3">
					<span class="text-3xl font-bold text-primary">{timeRemaining.days}</span>
					<span class="text-xs text-base-content/60">Days</span>
				</div>
			{/if}
			<div class="flex min-w-[70px] flex-col items-center rounded-lg bg-base-100 p-3">
				<span class="text-3xl font-bold text-primary">{timeRemaining.hours}</span>
				<span class="text-xs text-base-content/60">Hours</span>
			</div>
			<div class="flex min-w-[70px] flex-col items-center rounded-lg bg-base-100 p-3">
				<span class="text-3xl font-bold text-primary">{timeRemaining.minutes}</span>
				<span class="text-xs text-base-content/60">Mins</span>
			</div>
			<div class="flex min-w-[70px] flex-col items-center rounded-lg bg-base-100 p-3">
				<span class="text-3xl font-bold text-primary">{timeRemaining.seconds}</span>
				<span class="text-xs text-base-content/60">Secs</span>
			</div>
		</div>
		{#if 'Notification' in window && Notification.permission === 'default'}
			<button
				onclick={requestNotificationPermission}
				class="btn mt-3 w-full btn-outline btn-sm btn-primary"
			>
				Enable Notifications
			</button>
		{/if}
	</div>
{/if}

<!-- Pickup Ready Banner -->
{#if data.reservation.status === 'active' && timeRemaining.isPickupTime && !data.pendingInviteForUser}
	<div class="mb-4 animate-pulse border-4 border-warning bg-warning/10 p-6 text-center">
		<IconCheckmark class="mx-auto mb-3 h-16 w-16 text-warning" />
		<h2 class="mb-2 text-2xl font-bold text-warning">Pickup Time!</h2>
		<p class="text-sm text-base-content/70">Your food is ready to be picked up now</p>
	</div>
{/if}

<!-- Claimed Banner -->
{#if data.reservation.status === 'claimed'}
	<div class="mb-4 border-4 border-success bg-success/10 p-6 text-center">
		<IconCheckmark class="mx-auto mb-3 h-16 w-16 text-success" />
		<h2 class="mb-2 text-2xl font-bold text-success">Food Claimed!</h2>
		{#if data.reservation.claimedAt}
			<p class="mb-1 text-sm text-base-content/70">
				{formatDate(data.reservation.claimedAt)} at {formatTime(data.reservation.claimedAt)}
			</p>
		{/if}
		{#if data.reservation.claimedBy && data.isOwner}
			{@const claimer = data.invites.find((inv) => inv.userId === data.reservation.claimedBy)}
			{#if claimer}
				<div class="mt-3 flex items-center justify-center gap-2 rounded-lg bg-base-100 p-3">
					<div class="placeholder avatar">
						<div class="w-8 rounded-full bg-primary/20 text-primary">
							<span class="text-sm">👤</span>
						</div>
					</div>
					<span class="text-sm font-semibold">Claimed by your friend</span>
				</div>
			{/if}
		{/if}
	</div>
{/if}

<!-- Cancelled Banner -->
{#if data.reservation.status === 'cancelled'}
	<div class="mb-4 border-4 border-error bg-error/10 p-6 text-center">
		<IconCancel class="mx-auto mb-3 h-16 w-16 text-error" />
		<h2 class="mb-2 text-2xl font-bold text-error">Reservation Cancelled</h2>
		<p class="text-sm text-base-content/70">This reservation has been cancelled</p>
	</div>
{/if}

<!-- Header Section -->
<div class="mb-4 bg-base-100 p-4">
	<h1 class="mb-1 text-2xl font-bold">{data.offer.name}</h1>
	<p class="mb-3 text-sm text-base-content/70">{data.offer.description}</p>
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2 text-sm">
			<IconFood class="h-4 w-4 text-base-content/60" />
			<span class="font-medium">{data.business.name}</span>
		</div>
		<div class="text-2xl font-bold text-primary">
			{data.offer.price.toFixed(2)}
			{data.offer.currency}
		</div>
	</div>
</div>

<!-- Pickup Information -->
<div class="rounded-lg border border-base-300 bg-base-100 p-4">
	<h2 class="mb-3 flex items-center gap-2 text-lg font-bold">
		<IconLocation class="h-5 w-5" />
		Pickup Information
	</h2>

	{#if data.location}
		<div class="space-y-3">
			<div class="grid grid-cols-2 gap-2">
				<div class="rounded-lg bg-base-200 p-3">
					<div class="mb-1 flex items-center gap-1 text-xs text-base-content/60">
						<IconCalendar class="h-3 w-3" />
						Date
					</div>
					<p class="text-sm font-semibold">{formatDate(data.reservation.pickupFrom)}</p>
				</div>
				<div class="rounded-lg bg-base-200 p-3">
					<div class="mb-1 flex items-center gap-1 text-xs text-base-content/60">
						<IconClock class="h-3 w-3" />
						Time
					</div>
					<p class="text-sm font-semibold">
						{formatTime(data.reservation.pickupFrom)} - {formatTime(data.reservation.pickupUntil)}
					</p>
				</div>
			</div>

			<div class="bg-base-50 rounded-lg border border-base-300 p-3">
				<p class="mb-1 text-sm font-semibold">{data.location.name}</p>
				<p class="text-xs text-base-content/70">
					{data.location.address}<br />
					{data.location.city}, {data.location.zipCode}<br />
					{data.location.country}
				</p>
			</div>
		</div>
	{:else}
		<div class="alert">
			<IconLocation class="size-5" />
			<span>Location details not specified</span>
		</div>
	{/if}

	{#if data.reservation.notes}
		<div class="mt-3 rounded-lg bg-base-200 p-3">
			<p class="mb-1 text-xs font-semibold text-base-content/60">Your Notes</p>
			<p class="text-sm">{data.reservation.notes}</p>
		</div>
	{/if}
</div>

<!-- Business Info -->
<div class="rounded-lg border border-base-300 bg-base-100 p-4">
	<h2 class="mb-3 flex items-center gap-2 text-lg font-bold">
		<IconBuilding class="h-5 w-5" />
		Business
	</h2>
	<div class="flex items-center gap-3">
		<div class="avatar">
			<div class="w-12 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-base-100">
				<img src={data.business.logo.url} alt={data.business.name} />
			</div>
		</div>
		<div>
			<p class="font-semibold">{data.business.name}</p>
			<p class="text-xs text-base-content/60">{data.business.country}</p>
		</div>
	</div>
	<p class="mt-3 text-sm text-base-content/70">{data.business.description}</p>
</div>

<!-- Invite to Collection Section -->
{#if data.isOwner && data.reservation.status === 'active'}
	<div class="rounded-lg border border-base-300 bg-base-100 p-4">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="flex items-center gap-2 text-lg font-bold">
				<IconShare class="h-5 w-5" />
				Pass to Friend
			</h2>
		</div>

		{#if hasPendingInvite}
			{@const pendingInvite = data.invites.find((inv) => inv.status === 'pending')}
			<div class="mb-3 rounded-lg border-2 border-warning bg-warning/10 p-3">
				<p class="mb-2 text-sm font-semibold text-warning">Invite Link Active</p>
				<p class="mb-3 text-xs text-base-content/70">
					Share this link with a friend to let them collect this food
				</p>
				<div class="mb-2 rounded bg-base-100 p-2 font-mono text-xs break-all">
					{$page.url.origin}/reservations/{data.reservation.id}?invite={pendingInvite?.inviteToken}
				</div>
				<div class="flex gap-2">
					<button
						onclick={() => {
							inviteLink = `${$page.url.origin}/reservations/${data.reservation.id}?invite=${pendingInvite?.inviteToken}`;
							copyInviteLink();
						}}
						class="btn flex-1 gap-2 btn-sm"
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
							class="btn flex-1 gap-2 btn-sm btn-primary"
						>
							<IconShare class="h-4 w-4" />
							Share
						</button>
					{/if}
				</div>
			</div>
			<form method="POST" action="?/cancelInvite" use:enhance>
				<button type="submit" class="btn btn-block gap-2 btn-ghost btn-sm">
					<IconDismiss class="h-4 w-4" />
					Cancel Invite
				</button>
			</form>
		{:else if data.invites.length > 0 && data.invites[0].status === 'accepted'}
			<div class="rounded-lg bg-success/10 p-3">
				<p class="text-sm font-semibold text-success">Invite Accepted</p>
				<p class="mt-1 text-xs text-base-content/70">Your friend can now collect this food</p>
			</div>
		{:else}
			<p class="mb-3 text-sm text-base-content/70">
				Can't make it? Let a friend collect this food instead!
			</p>
			<button onclick={() => (showInviteModal = true)} class="btn btn-block gap-2 btn-primary">
				<IconShare class="h-4 w-4" />
				Create Invite Link
			</button>
		{/if}
	</div>
{/if}

<!-- Pending Invite (for invited user via link) -->
{#if data.pendingInviteForUser}
	<div class="rounded-lg border-4 border-primary bg-primary/10 p-6">
		<div class="mb-4 text-center">
			<IconPersonAdd class="mx-auto mb-3 h-16 w-16 text-primary" />
			<h2 class="mb-2 text-2xl font-bold text-primary">You've Been Invited!</h2>
			<p class="text-sm text-base-content/70">Someone wants to pass this food collection to you</p>
		</div>

		<div class="mb-4 rounded-lg border border-base-300 bg-base-100 p-4">
			<div class="mb-3">
				<p class="mb-1 text-xs font-semibold text-base-content/60">Offer</p>
				<p class="font-semibold">{data.offer.name}</p>
			</div>
			<div class="mb-3">
				<p class="mb-1 text-xs font-semibold text-base-content/60">Pickup Time</p>
				<p class="text-sm">
					{formatDate(data.reservation.pickupFrom)} • {formatTime(data.reservation.pickupFrom)} - {formatTime(
						data.reservation.pickupUntil
					)}
				</p>
			</div>
			<div>
				<p class="mb-1 text-xs font-semibold text-base-content/60">Location</p>
				<p class="text-sm">{data.business.name}</p>
				{#if data.location}
					<p class="text-xs text-base-content/60">{data.location.address}, {data.location.city}</p>
				{/if}
			</div>
		</div>

		{#if form?.error}
			<div class="mb-4 alert alert-error">
				<IconDismiss class="size-5" />
				<span>{form.error}</span>
			</div>
		{/if}

		<div class="flex gap-2">
			<form
				method="POST"
				action="?/declineInvite&invite={$page.url.searchParams.get('invite')}"
				use:enhance
				class="flex-1"
			>
				<button type="submit" class="btn btn-block gap-2 btn-ghost">
					<IconDismiss class="h-5 w-5" />
					Decline
				</button>
			</form>
			<form
				method="POST"
				action="?/acceptInvite&invite={$page.url.searchParams.get('invite')}"
				use:enhance
				class="flex-1"
			>
				<button type="submit" class="btn btn-block gap-2 btn-lg btn-primary">
					<IconCheckmark class="h-5 w-5" />
					Accept & Collect
				</button>
			</form>
		</div>
	</div>
{:else}
	<!-- Action Buttons -->
	{#if data.reservation.status === 'active' && (data.isOwner || data.userInvite?.status === 'accepted')}
		<div class="space-y-2">
			<button
				onclick={() => (showClaimModal = true)}
				class="btn btn-block gap-2 btn-lg btn-success"
			>
				<IconCheckmark class="h-5 w-5" />
				Claim Food
			</button>
		</div>
	{/if}

	<!-- Create Invite Modal -->
	{#if showInviteModal}
		<div class="modal-open modal">
			<div class="modal-box">
				<button
					onclick={() => {
						showInviteModal = false;
						inviteLink = '';
						linkCopied = false;
					}}
					class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
				>
					✕
				</button>
				<h3 class="mb-4 text-xl font-bold">Invite to Collection</h3>

				{#if form?.error}
					<div class="mb-4 alert alert-error">
						<IconDismiss class="size-5" />
						<span>{form.error}</span>
					</div>
				{/if}

				{#if inviteLink}
					<div class="mb-4 alert alert-success">
						<IconCheckmark class="size-5" />
						<span>Invite link created!</span>
					</div>

					<div class="mb-4">
						<label class="label">
							<span class="label-text font-semibold">Share this link</span>
						</label>
						<div class="flex gap-2">
							<input
								type="text"
								value={inviteLink}
								readonly
								class="input-bordered input flex-1 font-mono text-xs"
							/>
							<button onclick={copyInviteLink} class="btn btn-square gap-2">
								<IconCopy class="h-5 w-5" />
							</button>
						</div>
						{#if linkCopied}
							<label class="label">
								<span class="label-text-alt text-success">Link copied to clipboard!</span>
							</label>
						{/if}
					</div>

					{#if navigator.share}
						<button onclick={shareInviteLink} class="btn btn-block gap-2 btn-primary">
							<IconShare class="h-5 w-5" />
							Share via...
						</button>
					{/if}

					<div class="modal-action">
						<button
							onclick={() => {
								showInviteModal = false;
								inviteLink = '';
								linkCopied = false;
							}}
							class="btn"
						>
							Done
						</button>
					</div>
				{:else}
					<p class="mb-4 text-sm text-base-content/70">
						Create a shareable link that allows one person to collect this food reservation on your
						behalf.
					</p>

					<div class="mb-4 rounded-lg border border-warning bg-warning/10 p-3">
						<p class="text-xs text-base-content/70">
							⚠️ Only one person can use this invite. Once accepted, they'll be able to claim the
							food.
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
						<div class="modal-action">
							<button
								type="button"
								onclick={() => (showInviteModal = false)}
								class="btn btn-ghost"
								disabled={inviteLoading}
							>
								Cancel
							</button>
							<button type="submit" class="btn btn-primary" disabled={inviteLoading}>
								{#if inviteLoading}
									<span class="loading loading-spinner"></span>
								{/if}
								Create Invite Link
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

	<!-- Claim Modal -->
	{#if showClaimModal}
		<div class="modal-open modal">
			<div class="modal-box max-w-sm">
				<button
					onclick={() => (showClaimModal = false)}
					class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
				>
					✕
				</button>
				<h3 class="mb-4 text-center text-xl font-bold">Claim Your Food</h3>

				{#if form?.error && claimLoading === false}
					<div class="mb-4 alert alert-error">
						<IconDismiss class="size-5" />
						<span>{form.error}</span>
					</div>
				{/if}

				<!-- QR Code Display -->
				<div class="mb-4 flex flex-col items-center">
					<div class="rounded-lg border-2 border-base-300 bg-white p-6">
						<IconQrCode class="h-32 w-32 text-gray-800" />
					</div>
					<div class="mt-3 w-full rounded-lg bg-base-200 p-3">
						<p class="mb-1 text-center text-xs text-base-content/60">Claim Token</p>
						<p class="text-center font-mono text-sm font-semibold break-all">
							{data.reservation.claimToken}
						</p>
					</div>
				</div>

				<div class="divider my-2 text-xs">OR</div>

				<!-- Swipe to Claim -->
				<div class="mb-4">
					<p class="mb-3 text-center text-sm text-base-content/70">
						Swipe right to confirm you've received your food
					</p>
					<div class="relative h-14 w-full overflow-hidden rounded-full bg-base-200">
						<div
							class="absolute top-0 left-0 h-full rounded-full bg-success transition-all duration-100"
							style="width: {swipeProgress}%"
						></div>
						<button
							type="button"
							class="absolute top-0 left-0 h-14 w-14 cursor-grab rounded-full bg-success text-success-content transition-transform active:cursor-grabbing"
							style="transform: translateX({(swipeProgress / 100) * (300 - 56)}px)"
							onmousedown={handleSwipeStart}
							ontouchstart={handleSwipeStart}
						>
							<IconCheckmark class="mx-auto h-6 w-6" />
						</button>
						<div
							class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold"
							style="opacity: {1 - swipeProgress / 100}"
						>
							Swipe to claim →
						</div>
					</div>
				</div>

				<form
					id="claimForm"
					method="POST"
					action="?/claimReservation"
					use:enhance={() => {
						claimLoading = true;
						return async ({ update }) => {
							await update();
							claimLoading = false;
						};
					}}
				></form>

				{#if claimLoading}
					<div class="mt-4 flex items-center justify-center gap-2">
						<span class="loading loading-md loading-spinner"></span>
						<span class="text-sm">Processing claim...</span>
					</div>
				{/if}
			</div>
			<div class="modal-backdrop" onclick={() => (showClaimModal = false)}></div>
		</div>
	{/if}
{/if}
