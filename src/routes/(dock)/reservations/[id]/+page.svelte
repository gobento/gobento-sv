<!-- /src/routes/(dock)/reservations/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import IconTicket from '~icons/fluent/ticket-diagonal-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconPersonAdd from '~icons/fluent/person-add-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-filled';
	import IconDismiss from '~icons/fluent/dismiss-circle-24-regular';
	import IconQrCode from '~icons/fluent/qr-code-24-regular';
	import IconFood from '~icons/fluent/food-24-regular';
	import IconPeople from '~icons/fluent/people-24-regular';
	import IconBuilding from '~icons/fluent/building-24-regular';

	let { data, form } = $props();

	let showInviteModal = $state(false);
	let showClaimModal = $state(false);
	let friendEmail = $state('');
	let qrCodeDataUrl = $state('');
	let inviteLoading = $state(false);
	let claimLoading = $state(false);
	let swipeProgress = $state(0);
	let isDragging = $state(false);
	let startX = $state(0);

	function formatDate(date: Date) {
		return new Date(date).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function formatTime(date: Date) {
		return new Date(date).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusBadge(status: string) {
		const badges = {
			active: 'badge-success',
			completed: 'badge-info',
			expired: 'badge-error',
			claimed: 'badge-primary'
		};
		return badges[status as keyof typeof badges] || 'badge-ghost';
	}

	function getStatusText(status: string) {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}

	function handleSwipeStart(e: MouseEvent | TouchEvent) {
		isDragging = true;
		startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
	}

	function handleSwipeMove(e: MouseEvent | TouchEvent) {
		if (!isDragging) return;

		const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const diff = currentX - startX;
		const maxWidth = 300;
		const progress = Math.max(0, Math.min(100, (diff / maxWidth) * 100));
		swipeProgress = progress;
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

	$effect(() => {
		if (form?.success && !claimLoading) {
			showInviteModal = false;
			showClaimModal = false;
			friendEmail = '';
			swipeProgress = 0;
		}
	});
</script>

<svelte:window
	onmousemove={handleSwipeMove}
	onmouseup={handleSwipeEnd}
	ontouchmove={handleSwipeMove}
	ontouchend={handleSwipeEnd}
/>

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
				<img src={`/api/files/${data.business.profilePictureId}`} alt={data.business.name} />
			</div>
		</div>
		<div>
			<p class="font-semibold">{data.business.name}</p>
			<p class="text-xs text-base-content/60">{data.business.country}</p>
		</div>
	</div>
	<p class="mt-3 text-sm text-base-content/70">{data.business.description}</p>
</div>

<!-- Friends Section -->
{#if data.isOwner || data.invites.length > 0}
	<div class="rounded-lg border border-base-300 bg-base-100 p-4">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="flex items-center gap-2 text-lg font-bold">
				<IconPeople class="h-5 w-5" />
				Friends
			</h2>
			{#if data.isOwner && data.reservation.status === 'active'}
				<button onclick={() => (showInviteModal = true)} class="btn gap-2 btn-sm btn-primary">
					<IconPersonAdd class="h-4 w-4" />
					Invite
				</button>
			{/if}
		</div>

		{#if data.invites.length > 0}
			<div class="space-y-2">
				{#each data.invites as invite}
					<div class="flex items-center justify-between rounded-lg bg-base-200 p-3">
						<div class="flex items-center gap-2">
							<div class="placeholder avatar">
								<div class="w-8 rounded-full bg-primary/20 text-primary">
									<span class="text-sm">👤</span>
								</div>
							</div>
							<span class="text-sm font-medium">Friend</span>
						</div>
						<span
							class="badge badge-sm {invite.status === 'accepted'
								? 'badge-success'
								: invite.status === 'pending'
									? 'badge-warning'
									: invite.status === 'declined'
										? 'badge-error'
										: 'badge-ghost'}"
						>
							{invite.status}
						</span>
					</div>
				{/each}
			</div>
		{:else if data.reservation.status !== 'claimed'}
			<div class="py-4 text-center text-base-content/60">
				<IconPeople class="mx-auto mb-2 h-6 w-6 opacity-50" />
				<p class="text-xs">No friends invited yet</p>
			</div>
		{/if}
	</div>
{/if}

<!-- Pending Invite -->
{#if !data.isOwner && data.userInvite && data.userInvite.status === 'pending'}
	<div class="rounded-lg border-2 border-warning bg-base-100 p-4">
		<h2 class="mb-2 flex items-center gap-2 text-lg font-bold text-warning">
			<IconPersonAdd class="h-5 w-5" />
			You've Been Invited!
		</h2>
		<p class="mb-3 text-sm text-base-content/70">
			Accept this invitation to join the reservation and pick up food together.
		</p>
		<div class="flex gap-2">
			<form method="POST" action="?/declineInvite" use:enhance class="flex-1">
				<button type="submit" class="btn btn-block gap-2 btn-ghost btn-sm">
					<IconDismiss class="h-4 w-4" />
					Decline
				</button>
			</form>
			<form method="POST" action="?/acceptInvite" use:enhance class="flex-1">
				<button type="submit" class="btn btn-block gap-2 btn-sm btn-success">
					<IconCheckmark class="h-4 w-4" />
					Accept
				</button>
			</form>
		</div>
	</div>
{/if}

{#if data.reservation.status === 'active' && (data.isOwner || data.userInvite?.status === 'accepted')}
	<button onclick={() => (showClaimModal = true)} class="btn btn-block gap-2 btn-lg btn-success">
		<IconCheckmark class="h-5 w-5" />
		Claim Food
	</button>
{/if}

<!-- Invite Friend Modal -->
{#if showInviteModal}
	<div class="modal-open modal">
		<div class="modal-box">
			<button
				onclick={() => (showInviteModal = false)}
				class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
			>
				✕
			</button>
			<h3 class="mb-4 text-xl font-bold">Invite a Friend</h3>

			{#if form?.error}
				<div class="mb-4 alert alert-error">
					<IconDismiss class="size-5" />
					<span>{form.error}</span>
				</div>
			{/if}

			{#if form?.success && !claimLoading}
				<div class="mb-4 alert alert-success">
					<IconCheckmark class="size-5" />
					<span>{form.message}</span>
				</div>
			{/if}

			<form
				method="POST"
				action="?/inviteFriend"
				use:enhance={() => {
					inviteLoading = true;
					return async ({ update }) => {
						await update();
						inviteLoading = false;
					};
				}}
			>
				<div class="form-control">
					<label class="label" for="friendEmail">
						<span class="label-text font-semibold">Friend's Email</span>
					</label>
					<input
						id="friendEmail"
						type="email"
						name="friendEmail"
						bind:value={friendEmail}
						placeholder="friend@example.com"
						class="input-bordered input"
						required
					/>
					<label class="label">
						<span class="label-text-alt text-base-content/60">
							Your friend must have an account to receive the invitation
						</span>
					</label>
				</div>

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
						Send Invite
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop" onclick={() => (showInviteModal = false)}></div>
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
