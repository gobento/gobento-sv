<!-- /src/routes/(dock)/reservations/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { formatDate, formatTime } from '$lib/util.js';
	import { onMount, onDestroy } from 'svelte';

	import IconLocation from '~icons/fluent/location-24-regular';
	import IconPersonAdd from '~icons/fluent/person-add-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-filled';
	import IconDismiss from '~icons/fluent/dismiss-circle-24-regular';
	import IconFood from '~icons/fluent/food-24-regular';
	import IconShare from '~icons/fluent/share-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconTimer from '~icons/fluent/timer-24-regular';
	import IconChevronRight from '~icons/fluent/chevron-right-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';
	import FluentAlert24Regular from '~icons/fluent/alert-24-regular';

	import CollectFoodModal from './CollectFoodModal.svelte';
	import CreateInviteModal from './CreateInviteModal.svelte';

	import OptimizedLogoImage from '$lib/components/images/OptimizedLogoImage.svelte';
	import OptimizedLocationImage from '$lib/components/images/OptimizedLocationImage.svelte';
	import LocationCard from '$lib/components/maps/LocationCard.svelte';
	import Alert from '$lib/components/Alert.svelte';

	let { data, form } = $props();

	let showInviteModal = $state(false);
	let showCollectModal = $state(false);
	let inviteLoading = $state(false);
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

		if (form?.success && !inviteLoading) {
			if (!form.inviteLink && !form.inviteAccepted && !form.inviteDeclined) {
				showInviteModal = false;
				showCollectModal = false;
			}
		}
	});

	const hasPendingInvite = $derived(
		data.isOwner && data.invites.some((inv) => inv.status === 'pending')
	);

	const hasAcceptedInvite = $derived(
		data.isOwner && data.invites.some((inv) => inv.status === 'accepted')
	);

	const acceptedInvite = $derived(data.invites.find((inv) => inv.status === 'accepted'));

	const canShare = $derived(
		browser && data.isOwner && typeof navigator !== 'undefined' && navigator.share !== undefined
	);

	const baseUrl = 'https://yourapp.com';
	const reservationUrl = `${baseUrl}/reservations/${data.reservation.id}`;

	const reservationDescription = data.pendingInviteForUser
		? `You've been invited to collect ${data.offer.name} from ${data.business.name}. Pickup on ${formatDate(data.reservation.pickupFrom)} between ${formatTime(data.reservation.pickupFrom)}–${formatTime(data.reservation.pickupUntil)}.`
		: `${data.offer.name} reservation at ${data.business.name}. Pickup on ${formatDate(data.reservation.pickupFrom)} between ${formatTime(data.reservation.pickupFrom)}–${formatTime(data.reservation.pickupUntil)}.`;

	const pageTitle = data.pendingInviteForUser
		? `You're Invited: ${data.offer.name} at ${data.business.name}`
		: data.reservation.status === 'claimed'
			? `✓ Collected: ${data.offer.name}`
			: `Your Reservation: ${data.offer.name}`;
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={reservationDescription} />

	<meta property="og:title" content={pageTitle} />
	<meta property="og:site_name" content="YourAppName" />
	<meta property="og:url" content={reservationUrl} />
	<meta property="og:description" content={reservationDescription} />
	<meta property="og:type" content={data.pendingInviteForUser ? 'website' : 'article'} />
	<meta property="og:image" content={data.business.logo.url} />
	<meta property="og:image:alt" content="{data.business.name} - {data.offer.name}" />

	{#if data.reservation.status === 'active'}
		<meta
			property="event:start_time"
			content={new Date(data.reservation.pickupFrom).toISOString()}
		/>
		<meta
			property="event:end_time"
			content={new Date(data.reservation.pickupUntil).toISOString()}
		/>
	{/if}

	{#if data.location}
		<meta property="og:locality" content={data.location.city} />
		<meta property="og:country-name" content={data.location.country} />
		<meta property="place:location:latitude" content={data.location.latitude?.toString()} />
		<meta property="place:location:longitude" content={data.location.longitude?.toString()} />
	{/if}

	<meta property="og:locale" content="en_US" />
	<meta
		property="article:published_time"
		content={new Date(data.reservation.reservedAt).toISOString()}
	/>

	{#if data.pendingInviteForUser}
		<meta property="og:type" content="website" />
		<meta name="robots" content="noindex, nofollow" />
	{/if}
</svelte:head>

<div class="space-y-4">
	<!-- Status Banners -->
	{#if form?.inviteAccepted}
		<Alert type="success">
			<div class="flex items-center gap-3">
				<IconCheckmark class="size-8" />
				<div>
					<h3 class="font-bold">Invite Accepted</h3>
					<p class="text-sm opacity-80">You can now collect this food reservation</p>
				</div>
			</div>
		</Alert>
	{/if}

	{#if form?.inviteDeclined}
		<Alert type="info">
			<div class="flex items-center gap-3">
				<IconDismiss class="size-8" />
				<div>
					<h3 class="font-bold">Invite Declined</h3>
					<p class="text-sm opacity-80">You've declined this invitation</p>
				</div>
			</div>
		</Alert>
	{/if}

	{#if data.reservation.status === 'claimed'}
		<Alert type="success">
			<div class="flex items-center gap-3">
				<IconCheckmark class="size-8" />
				<div class="flex-1">
					<h3 class="font-bold">Food Collected</h3>
					{#if data.reservation.claimedAt}
						<p class="text-sm opacity-80">
							{formatDate(data.reservation.claimedAt)} at {formatTime(data.reservation.claimedAt)}
						</p>
					{/if}
					{#if data.reservation.claimedBy && data.isOwner}
						{@const claimer = data.invites.find(
							(inv) => inv.invitedAccountId === data.reservation.claimedBy
						)}
						{#if claimer}
							<div class="mt-2 flex items-center gap-2 text-sm">
								<span>👤</span>
								<span>Collected by your friend</span>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</Alert>
	{/if}

	<!-- Countdown Timers -->
	{#if data.reservation.status === 'active' && !data.pendingInviteForUser}
		{#if timeRemaining.isPickupTime}
			{@const now = new Date()}
			{@const pickupEnd = new Date(data.reservation.pickupUntil)}
			{@const diff = pickupEnd.getTime() - now.getTime()}
			{@const daysLeft = Math.floor(diff / (1000 * 60 * 60 * 24))}
			{@const hoursLeft = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))}
			{@const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))}
			{@const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000)}

			<!-- Active Pickup Window -->
			<div class="space-y-4">
				<Alert type="success" class="animate-pulse border-2">
					<div class="flex items-center gap-4">
						<div class="flex h-14 w-14 items-center justify-center rounded-full bg-success/20">
							<IconCheckmark class="size-8" />
						</div>
						<div>
							<h3 class="text-xl font-bold">🎉 Pickup Time!</h3>
							<p class="text-sm opacity-80">Your food is ready to be collected now</p>
						</div>
					</div>
				</Alert>

				<div
					class="rounded-2xl border border-warning/20 bg-linear-to-br from-warning/5 to-warning/10 p-6"
				>
					<div class="mb-4 text-center">
						<div class="mb-2 inline-flex items-center gap-2 rounded-full bg-warning/10 px-4 py-2">
							<IconTimer class="size-5 text-warning" />
							<span class="text-sm font-semibold tracking-wide text-warning uppercase"
								>Window Closes In</span
							>
						</div>
						<p class="mt-1 text-sm text-base-content/60">
							Pickup until {formatTime(data.reservation.pickupUntil)}
						</p>
					</div>

					<div class="flex justify-center gap-2 sm:gap-4">
						{#if daysLeft > 0}
							<div
								class="flex min-w-[70px] flex-col items-center rounded-xl bg-base-100 p-4 shadow-sm sm:min-w-[90px]"
							>
								<span class="text-3xl leading-none font-bold text-warning tabular-nums sm:text-4xl">
									{daysLeft}
								</span>
								<span
									class="mt-2 text-xs font-medium tracking-wider text-base-content/50 uppercase"
								>
									{daysLeft === 1 ? 'Day' : 'Days'}
								</span>
							</div>
						{/if}

						<div
							class="flex min-w-[70px] flex-col items-center rounded-xl bg-base-100 p-4 shadow-sm sm:min-w-[90px]"
						>
							<span class="text-3xl leading-none font-bold text-warning tabular-nums sm:text-4xl">
								{hoursLeft.toString().padStart(2, '0')}
							</span>
							<span class="mt-2 text-xs font-medium tracking-wider text-base-content/50 uppercase"
								>Hours</span
							>
						</div>

						<div class="flex items-center text-2xl font-bold text-warning/40 sm:text-3xl">:</div>

						<div
							class="flex min-w-[70px] flex-col items-center rounded-xl bg-base-100 p-4 shadow-sm sm:min-w-[90px]"
						>
							<span class="text-3xl leading-none font-bold text-warning tabular-nums sm:text-4xl">
								{minutesLeft.toString().padStart(2, '0')}
							</span>
							<span class="mt-2 text-xs font-medium tracking-wider text-base-content/50 uppercase"
								>Minutes</span
							>
						</div>

						<div class="flex items-center text-2xl font-bold text-warning/40 sm:text-3xl">:</div>

						<div
							class="flex min-w-[70px] flex-col items-center rounded-xl bg-base-100 p-4 shadow-sm sm:min-w-[90px]"
						>
							<span class="text-3xl leading-none font-bold text-warning tabular-nums sm:text-4xl">
								{secondsLeft.toString().padStart(2, '0')}
							</span>
							<span class="mt-2 text-xs font-medium tracking-wider text-base-content/50 uppercase"
								>Seconds</span
							>
						</div>
					</div>
				</div>

				<!-- Collect Button -->
				{#if (data.isOwner || data.userInvite?.status === 'accepted') && !hasAcceptedInvite}
					<button
						onclick={() => {
							showCollectModal = true;
							hapticFeedback('heavy');
						}}
						class="btn btn-block gap-3 shadow-lg transition-all btn-lg btn-success hover:shadow-xl"
					>
						<IconCheckmark class="size-6" />
						<span class="text-lg">Collect Food Now</span>
						<IconArrowRight class="size-5" />
					</button>
				{/if}
			</div>
		{:else if !timeRemaining.hasStarted}
			<!-- Countdown Before Pickup -->
			<div
				class="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 to-primary/10 p-6 shadow-lg"
			>
				<div class="mb-6 text-center">
					<div class="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
						<IconTimer class="size-5 text-primary" />
						<span class="text-sm font-semibold tracking-wide text-primary uppercase"
							>Pickup Starts In</span
						>
					</div>
					<h2 class="mt-3 text-2xl font-bold">Food Ready In</h2>
					<p class="mt-1 text-sm text-base-content/60">
						Available from {formatTime(data.reservation.pickupFrom)}–{formatTime(
							data.reservation.pickupUntil
						)}
					</p>
				</div>

				<div class="flex justify-center gap-2 sm:gap-4">
					{#if timeRemaining.days > 0}
						<div
							class="flex min-w-[70px] flex-col items-center rounded-xl bg-base-100 p-4 shadow-sm sm:min-w-[90px]"
						>
							<span class="text-3xl leading-none font-bold text-primary tabular-nums sm:text-4xl">
								{timeRemaining.days}
							</span>
							<span class="mt-2 text-xs font-medium tracking-wider text-base-content/50 uppercase">
								{timeRemaining.days === 1 ? 'Day' : 'Days'}
							</span>
						</div>
					{/if}

					<div
						class="flex min-w-[70px] flex-col items-center rounded-xl bg-base-100 p-4 shadow-sm sm:min-w-[90px]"
					>
						<span class="text-3xl leading-none font-bold text-primary tabular-nums sm:text-4xl">
							{timeRemaining.hours.toString().padStart(2, '0')}
						</span>
						<span class="mt-2 text-xs font-medium tracking-wider text-base-content/50 uppercase"
							>Hours</span
						>
					</div>

					<div class="flex items-center text-2xl font-bold text-primary/40 sm:text-3xl">:</div>

					<div
						class="flex min-w-[70px] flex-col items-center rounded-xl bg-base-100 p-4 shadow-sm sm:min-w-[90px]"
					>
						<span class="text-3xl leading-none font-bold text-primary tabular-nums sm:text-4xl">
							{timeRemaining.minutes.toString().padStart(2, '0')}
						</span>
						<span class="mt-2 text-xs font-medium tracking-wider text-base-content/50 uppercase"
							>Minutes</span
						>
					</div>

					<div class="flex items-center text-2xl font-bold text-primary/40 sm:text-3xl">:</div>

					<div
						class="flex min-w-[70px] flex-col items-center rounded-xl bg-base-100 p-4 shadow-sm sm:min-w-[90px]"
					>
						<span class="text-3xl leading-none font-bold text-primary tabular-nums sm:text-4xl">
							{timeRemaining.seconds.toString().padStart(2, '0')}
						</span>
						<span class="mt-2 text-xs font-medium tracking-wider text-base-content/50 uppercase"
							>Seconds</span
						>
					</div>
				</div>

				{#if browser && 'Notification' in window && Notification.permission === 'default'}
					<button
						onclick={requestNotificationPermission}
						class="btn mt-6 btn-block gap-2 btn-outline btn-sm btn-primary"
					>
						<FluentAlert24Regular class="size-4" />
						Get Notified When Ready
					</button>
				{/if}
			</div>
		{/if}
	{/if}

	<!-- Business Info -->
	<a
		href="/businesses/{data.business.accountId}"
		class="block rounded-2xl bg-base-100 p-6 transition-all hover:shadow-md"
	>
		<div class="flex items-start gap-4">
			<div class="size-16 shrink-0 overflow-hidden rounded-2xl">
				<OptimizedLogoImage
					src={data.business.logo.url}
					alt={data.business.name}
					size="md"
					shape="square"
					priority={true}
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

	<!-- Offer Details -->
	<div class="rounded-2xl bg-base-100 p-6">
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

	<!-- Pickup Location & Details -->
	<div class=" px-6">
		<div class="space-y-4">
			{#if data.location}
				<div class="overflow-hidden rounded-xl">
					<OptimizedLocationImage
						src={data.location.imageUrl}
						alt={data.location.name}
						priority={true}
						class="h-48 w-full object-cover"
					/>
				</div>

				<LocationCard
					name={data.location.name}
					address={data.location.address}
					city={data.location.city}
					province={data.location.province}
					zipCode={data.location.zipCode}
					country={data.location.country}
					latitude={data.location.latitude}
					longitude={data.location.longitude}
				/>
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

	<!-- Invite System -->
	{#if data.pendingInviteForUser}
		<!-- Pending Invite for User -->
		<div class="rounded-2xl border-l-4 border-primary bg-primary/10 p-6">
			<div class="mb-6 text-center">
				<IconPersonAdd class="mx-auto mb-4 size-16 text-primary" />
				<h2 class="text-2xl font-bold text-primary">You've Been Invited</h2>
				<p class="mt-2 text-sm text-primary/80">
					Someone wants to pass this food collection to you
				</p>
			</div>

			<div class="mb-6 space-y-4 rounded-xl bg-base-100 p-4">
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
				<Alert type="error" class="mb-4">
					{form.error}
				</Alert>
			{/if}

			<div class="flex gap-3">
				<form
					method="POST"
					action="?/declineInvite&invite={$page.url.searchParams.get('invite')}"
					use:enhance
					class="flex-1"
				>
					<button type="submit" class="btn btn-block gap-2 btn-ghost">
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
					<button type="submit" class="btn btn-block gap-2 btn-primary">
						<IconCheckmark class="size-5" />
						Accept
					</button>
				</form>
			</div>
		</div>
	{:else if data.isOwner && data.reservation.status === 'active'}
		<!-- Invite Management for Owner -->
		<div class="rounded-2xl bg-base-100 p-6">
			<div class="mb-3 flex items-center gap-2">
				<div class="rounded-lg bg-primary/10 p-2">
					<IconShare class="size-5 text-primary" />
				</div>
				<h3 class="text-lg font-bold text-base-content">Can't collect it in time?</h3>
			</div>

			{#if hasAcceptedInvite && acceptedInvite}
				<Alert type="info" class="mb-4">
					<div>
						<p class="font-medium">Friend Has Access</p>
						<p class="mt-1 text-sm opacity-80">
							Your friend can now collect this food. Cancel the invite if you want to collect it
							yourself instead.
						</p>
					</div>
				</Alert>
				<form method="POST" action="?/cancelInvite" use:enhance>
					<button type="submit" class="btn btn-block gap-2 btn-outline btn-error">
						<IconDismiss class="size-5" />
						Cancel Invite
					</button>
				</form>
			{:else if hasPendingInvite}
				{@const pendingInvite = data.invites.find((inv) => inv.status === 'pending')}

				<div class="mb-4">
					<p class="font-medium">Invite Link Active</p>
					<p class="mt-2 text-sm opacity-80">
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
							class="btn flex-1 gap-2 btn-secondary"
						>
							<IconCopy class="size-5" />
							{linkCopied ? 'Copied!' : 'Copy Link'}
						</button>
						{#if canShare}
							<button
								onclick={() => {
									inviteLink = `${$page.url.origin}/reservations/${data.reservation.id}?invite=${pendingInvite?.inviteToken}`;
									shareInviteLink();
								}}
								class="btn flex-1 gap-2 btn-primary"
							>
								<IconShare class="size-5" />
								Share
							</button>
						{/if}
					</div>
				</div>

				<form method="POST" action="?/cancelInvite" use:enhance>
					<button type="submit" class="btn btn-block gap-2 btn-ghost btn-sm">
						<IconDismiss class="size-5" />
						Cancel Invite
					</button>
				</form>
			{:else}
				<p class="mb-4 text-sm text-base-content/60">Let a friend collect this food instead!</p>
				<button onclick={() => (showInviteModal = true)} class="btn btn-block gap-2 btn-primary">
					<IconShare class="size-5" />
					Pass to Friend
				</button>
			{/if}
		</div>
	{/if}
</div>

<CreateInviteModal
	bind:open={showInviteModal}
	{form}
	{inviteLoading}
	{linkCopied}
	{inviteLink}
	{canShare}
	{copyInviteLink}
	{shareInviteLink}
/>

<CollectFoodModal bind:open={showCollectModal} claimToken={data.reservation.claimToken} />
