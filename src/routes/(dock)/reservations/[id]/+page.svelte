<!-- /src/routes/(dock)/reservations/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import IconTicket from '~icons/fluent/ticket-diagonal-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconPersonAdd from '~icons/fluent/person-add-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-circle-24-regular';
	import IconQrCode from '~icons/fluent/qr-code-24-regular';

	let { data, form } = $props();

	let showInviteModal = $state(false);
	let friendEmail = $state('');
	let qrCodeDataUrl = $state('');
	let inviteLoading = $state(false);

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function formatTime(date: string) {
		return new Date(date).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusBadge(status: string) {
		const badges = {
			active: 'badge-success',
			completed: 'badge-info',
			expired: 'badge-error'
		};
		return badges[status as keyof typeof badges] || 'badge-ghost';
	}

	function getStatusText(status: string) {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}

	$effect(() => {
		if (form?.success) {
			showInviteModal = false;
			friendEmail = '';
		}
	});
</script>

<!-- Header -->
<div class="mb-6">
	<div class="flex items-start justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold">{data.offer.name}</h1>
			<div class="flex items-center gap-2">
				<span class="badge {getStatusBadge(data.reservation.status)} badge-lg">
					{getStatusText(data.reservation.status)}
				</span>
				{#if data.claim}
					<span class="badge badge-lg badge-primary">
						<IconCheckmark class="mr-1 h-4 w-4" />
						Claimed
					</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Main Content Grid -->
<div class="grid gap-6 lg:grid-cols-3">
	<!-- Left Column - Reservation Details -->
	<div class="space-y-6 lg:col-span-2">
		<!-- Offer Details Card -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Offer Details</h2>
				<p class="text-base-content/70">{data.offer.description}</p>
				<div class="divider"></div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-base-content/60">Price</span>
					<span class="text-2xl font-bold">
						{data.offer.price.toFixed(2)}
						{data.offer.currency}
					</span>
				</div>
			</div>
		</div>

		<!-- Location & Time Card -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Pickup Information</h2>

				{#if data.location}
					<div class="space-y-4">
						<div class="flex items-start gap-3">
							<IconLocation class="mt-1 size-5 shrink-0 text-primary" />
							<div>
								<p class="font-semibold">{data.location.name}</p>
								<p class="text-sm text-base-content/70">
									{data.location.address}<br />
									{data.location.city}, {data.location.zipCode}<br />
									{data.location.country}
								</p>
							</div>
						</div>

						<div class="divider"></div>

						<div class="flex items-start gap-3">
							<IconCalendar class="mt-1 size-5 shrink-0 text-primary" />
							<div>
								<p class="font-semibold">Pickup Date</p>
								<p class="text-sm text-base-content/70">
									{formatDate(data.reservation.pickupFrom)}
								</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<IconClock class="size-5shrink-0 mt-1 text-primary" />
							<div>
								<p class="font-semibold">Pickup Time Window</p>
								<p class="text-sm text-base-content/70">
									{formatTime(data.reservation.pickupFrom)} - {formatTime(
										data.reservation.pickupUntil
									)}
								</p>
							</div>
						</div>
					</div>
				{:else}
					<div class="alert alert-info">
						<span>Location details not specified</span>
					</div>
				{/if}

				{#if data.reservation.notes}
					<div class="divider"></div>
					<div>
						<p class="mb-2 font-semibold">Notes</p>
						<p class="text-sm text-base-content/70">{data.reservation.notes}</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Invited Friends Card -->
		{#if data.isOwner && data.invites.length > 0}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">Invited Friends</h2>
					<div class="space-y-3">
						{#each data.invites as invite}
							<div class="flex items-center justify-between rounded-lg bg-base-200 p-3">
								<div class="flex items-center gap-3">
									<div class="placeholder avatar">
										<div class="w-10 rounded-full bg-primary text-primary-content">
											<span class="text-lg">
												{invite.invitedAccountId ? '👤' : '📧'}
											</span>
										</div>
									</div>
									<div>
										<p class="font-medium">
											{invite.invitedAccountId ? 'Friend' : 'Pending'}
										</p>
										<p class="text-sm text-base-content/60">
											{invite.status}
										</p>
									</div>
								</div>
								<span
									class="badge {invite.status === 'accepted'
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
				</div>
			</div>
		{/if}

		<!-- Pending Invite Action -->
		{#if !data.isOwner && data.userInvite && data.userInvite.status === 'pending'}
			<div class="card border-2 border-warning bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">You've Been Invited!</h2>
					<p class="text-base-content/70">
						You've been invited to join this reservation. Accept or decline the invitation.
					</p>
					<div class="mt-4 card-actions justify-end gap-2">
						<form method="POST" action="?/declineInvite" use:enhance>
							<button type="submit" class="btn gap-2 btn-ghost">
								<IconDismiss class="size-5" />
								Decline
							</button>
						</form>
						<form method="POST" action="?/acceptInvite" use:enhance>
							<button type="submit" class="btn gap-2 btn-success">
								<IconCheckmark class="size-5" />
								Accept
							</button>
						</form>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Right Column - QR Code & Actions -->
	<div class="space-y-6">
		<!-- QR Code Card -->
		{#if data.reservation.status === 'active' && !data.claim}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body items-center text-center">
					<IconQrCode class="mb-2 h-8 w-8 text-primary" />
					<h2 class="card-title">Claim Code</h2>
					<p class="mb-4 text-sm text-base-content/70">Show this code to staff at pickup</p>

					{#if qrCodeDataUrl}
						<div class="rounded-lg bg-white p-4">
							<img src={qrCodeDataUrl} alt="QR Code" class="w-full max-w-[250px]" />
						</div>
					{/if}

					<div class="mt-4 w-full rounded-lg bg-base-200 p-3">
						<p class="mb-1 text-xs text-base-content/60">Claim Token</p>
						<p class="font-mono text-sm break-all">{data.reservation.claimToken}</p>
					</div>
				</div>
			</div>
		{:else if data.claim}
			<div class="card bg-success text-success-content shadow-xl">
				<div class="card-body items-center text-center">
					<IconCheckmark class="mb-2 h-12 w-12" />
					<h2 class="card-title">Claimed!</h2>
					<p class="text-sm">
						This reservation was claimed on {formatDate(data.claim.claimedAt)}
						at {formatTime(data.claim.claimedAt)}
					</p>
				</div>
			</div>
		{:else if data.reservation.status === 'expired'}
			<div class="card bg-error text-error-content shadow-xl">
				<div class="card-body items-center text-center">
					<IconDismiss class="mb-2 h-12 w-12" />
					<h2 class="card-title">Expired</h2>
					<p class="text-sm">This reservation has expired</p>
				</div>
			</div>
		{/if}

		<!-- Business Info Card -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-lg">Business</h2>
				<div class="flex items-center gap-3">
					<div class="avatar">
						<div class="w-12 rounded-full">
							<img src={`/api/files/${data.business.profilePictureId}`} alt={data.business.name} />
						</div>
					</div>
					<div>
						<p class="font-semibold">{data.business.name}</p>
						<p class="text-sm text-base-content/60">{data.business.country}</p>
					</div>
				</div>
				<p class="mt-2 text-sm text-base-content/70">{data.business.description}</p>
			</div>
		</div>

		<!-- Invite Friend Button (Owner Only) -->
		{#if data.isOwner && data.reservation.status === 'active'}
			<button onclick={() => (showInviteModal = true)} class="btn w-full gap-2 btn-primary">
				<IconPersonAdd class="size-5" />
				Invite a Friend
			</button>
		{/if}

		<!-- Reservation Info -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-lg">Reservation Info</h2>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-base-content/60">Reserved on</span>
						<span>{formatDate(data.reservation.reservedAt)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-base-content/60">Reservation ID</span>
						<span class="font-mono text-xs">{data.reservation.id.slice(0, 8)}...</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Invite Friend Modal -->
{#if showInviteModal}
	<div class="modal-open modal">
		<div class="modal-box">
			<h3 class="mb-4 text-lg font-bold">Invite a Friend</h3>

			{#if form?.error}
				<div class="mb-4 alert alert-error">
					<span>{form.error}</span>
				</div>
			{/if}

			{#if form?.success}
				<div class="mb-4 alert alert-success">
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
						<span class="label-text">Friend's Email</span>
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
						<span class="label-text-alt">
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
