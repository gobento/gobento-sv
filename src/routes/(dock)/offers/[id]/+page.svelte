<!-- src/routes/(dock)/offers/[id]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import IconMapPin from '~icons/fluent/location-24-regular';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconStore from '~icons/fluent/building-retail-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconCancel from '~icons/fluent/dismiss-circle-24-regular';
	import IconQr from '~icons/fluent/qr-code-24-regular';
	import { goto } from '$app/navigation';

	let { data, form } = $props();

	let isSubmitting = $state(false);
	let showReservationDialog = $state(false);
	let pickupDate = $state('');
	let minDate = $state('');
	let maxDate = $state('');

	// Initialize default values
	$effect(() => {
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);

		// Set minimum date to tomorrow
		minDate = tomorrow.toISOString().slice(0, 10);

		// Set default pickup date to tomorrow
		pickupDate = tomorrow.toISOString().slice(0, 10);

		// Set maximum date based on validUntil
		if (data.offer.validUntil) {
			const validUntilDate = new Date(data.offer.validUntil);
			maxDate = validUntilDate.toISOString().slice(0, 10);
		}
	});

	const formatPrice = (price: number, currency: string) => {
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: currency
		}).format(price);
	};

	const formatDate = (date: Date | string | null) => {
		if (!date) return null;
		return new Intl.DateTimeFormat('de-DE', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}).format(new Date(date));
	};

	const formatDateTime = (date: Date | string) => {
		return new Intl.DateTimeFormat('de-DE', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(date));
	};

	const formatTime = (timeStr: string) => {
		// timeStr is in format "HH:MM:SS"
		const [hours, minutes] = timeStr.split(':');
		return `${hours}:${minutes}`;
	};

	const getGoogleMapsUrl = (lat: number, lng: number) => {
		return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
	};

	const getLogoUrl = (key: string) => {
		return `/api/files/${key}`;
	};

	const handleEdit = () => {
		goto(`/offers/${data.offer.id}/edit`);
	};

	const handleDelete = async () => {
		if (!confirm('Are you sure you want to delete this offer?')) return;
		// TODO: Implement delete logic
		alert('Delete functionality to be implemented');
	};
</script>

<div class="relative mb-8 overflow-hidden rounded-2xl bg-base-300">
	<!-- Location Image Background (clickable to Google Maps) -->

	<a
		href="/locations/{data.location?.id}"
		class="group block border-t border-base-content/10 px-6 pt-4 pb-6 transition-colors duration-200 hover:bg-base-200/50"
	>
		<img
			src={getLogoUrl(data.location.imageId)}
			alt={data.location?.name}
			class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
		/>
		<div
			class="absolute inset-0 bg-linear-to-b from-transparent to-base-300/80 transition-opacity duration-300 group-hover:to-base-300/60"
		>
			<!-- Business Logo (centered, overlapping) -->
			<div class="relative -mt-10 px-6">
				<div class="flex items-end gap-4">
					<div class="avatar">
						<div class="h-20 w-20 rounded-xl border-4 border-base-200 bg-base-100">
							<img src={getLogoUrl(data.logo.key)} alt={data.business.name} />
						</div>
					</div>
				</div>
			</div>
		</div></a
	>

	<h3 class="text-lg font-semibold text-base-content">
		{data.business.name} - {data.location?.name}
	</h3>

	<!-- Location Details (clickable to location page) -->
	{#if data.location}
		<a
			href={getGoogleMapsUrl(data.location.latitude, data.location.longitude)}
			target="_blank"
			rel="noopener noreferrer"
			class="group relative block h-48 bg-base-300"
		>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="mb-1 flex items-center gap-2">
						<IconArrowRight
							class="size-5 text-base-content/40 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary"
						/>
					</div>
					<div class="space-y-0.5 text-sm text-base-content/70">
						<p>{data.location.address}</p>
						<p>
							{data.location.zipCode}
							{data.location.city}{#if data.location.state}, {data.location.state}{/if}
						</p>
						<p>{data.location.country}</p>
					</div>
				</div>
			</div>
		</a>
	{:else}
		<div class="mb-6 flex items-center gap-3 rounded-2xl bg-base-300 p-6">
			<IconStore class="size-6 text-base-content/70" />
			<div>
				<p class="font-medium text-base-content">Available at all locations</p>
				<p class="text-sm text-base-content/70">
					This offer can be claimed at any of this business's locations
				</p>
			</div>
		</div>
	{/if}
</div>

<!-- Pricing and Details -->
<div class="mb-6 rounded-2xl bg-base-300 p-6">
	<div class="px-6 pb-6">
		<h1 class="mb-3 text-4xl font-bold text-base-content">{data.offer.name}</h1>

		<!-- Offer Description -->
		<div class="prose mb-6 max-w-none">
			<p class="text-base leading-relaxed whitespace-pre-wrap text-base-content/80">
				{data.offer.description}
			</p>
		</div>
	</div>

	<!-- Tags Row -->
	<div class="mb-4 flex flex-wrap items-center gap-3">
		<div class="text-4xl font-bold text-primary">
			{formatPrice(data.offer.price, data.offer.currency)}
		</div>
		{#if data.offer.isRecurring}
			<span class="badge gap-2 badge-lg badge-primary">
				<IconRepeat class="size-4" />
				Recurring
			</span>
		{/if}
	</div>

	<!-- Pickup Time Window -->
	<div class="mb-4 rounded-lg bg-base-100 p-4">
		<div class="mb-2 flex items-center gap-2 text-base-content">
			<IconClock class="size-5" />
			<span class="font-medium">Pickup Hours</span>
		</div>
		<div class="text-sm text-base-content/70">
			<p class="text-lg font-semibold text-base-content">
				{formatTime(data.offer.pickupTimeFrom)} - {formatTime(data.offer.pickupTimeUntil)}
			</p>
			{#if data.offer.isRecurring}
				<p class="mt-1">Available daily during these hours</p>
			{:else}
				<p class="mt-1">Pick up today during these hours</p>
			{/if}
		</div>
	</div>

	{#if data.offer.validUntil}
		<div class="flex items-center gap-2 text-base-content/70">
			<IconCalendar class="size-5" />
			<span class="text-sm">Valid until {formatDate(data.offer.validUntil)}</span>
		</div>
	{/if}
</div>

<!-- Action Messages & Buttons -->
{#if form?.error}
	<div class="mb-4 alert alert-error">
		<span>{form.error}</span>
	</div>
{/if}

{#if form?.success}
	<div class="mb-4 alert alert-success">
		<IconCheckmark class="size-5" />
		<span>Action completed successfully!</span>
	</div>
{/if}

{#if data.userReservation}
	<!-- User's own reservation -->
	<div class="mb-4 rounded-xl border-2 border-primary bg-primary/10 p-6">
		<div class="mb-4 flex items-start gap-3">
			<IconCheckmark class="size-6 text-primary" />
			<div class="flex-1">
				<h3 class="font-semibold text-base-content">You've Reserved This Offer</h3>
				<p class="mt-1 text-sm text-base-content/70">
					Reserved on {formatDateTime(data.userReservation.reservedAt)}
				</p>
			</div>
		</div>

		<!-- Pickup Time Window -->
		<div class="mb-4 rounded-lg bg-base-100 p-4">
			<div class="mb-2 flex items-center gap-2 text-base-content">
				<IconClock class="size-5" />
				<span class="font-medium">Pickup Window</span>
			</div>
			<div class="space-y-1 text-sm text-base-content/70">
				<p>From: {formatDateTime(data.userReservation.pickupFrom)}</p>
				<p>Until: {formatDateTime(data.userReservation.pickupUntil)}</p>
			</div>
		</div>

		<!-- Claim Token Display -->
		<div class="rounded-lg bg-base-100 p-4">
			<div class="mb-2 flex items-center gap-2 text-base-content">
				<IconQr class="size-5" />
				<span class="font-medium">Claim Code</span>
			</div>
			<div class="flex items-center gap-3">
				<code class="rounded bg-base-200 px-4 py-2 font-mono text-2xl font-bold tracking-wider">
					{data.userReservation.claimToken}
				</code>
				<p class="text-xs text-base-content/70">Show this code to staff when picking up</p>
			</div>
		</div>

		<!-- Cancel Button -->
		<form
			method="POST"
			action="?/cancel"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}}
			class="mt-4"
		>
			<button type="submit" disabled={isSubmitting} class="btn w-full btn-outline btn-error">
				{#if isSubmitting}
					<span class="loading loading-md loading-spinner"></span>
					Canceling...
				{:else}
					<IconCancel class="size-5" />
					Cancel Reservation
				{/if}
			</button>
		</form>
	</div>
{:else if data.isUser && data.offer.isActive}
	{#if data.isReserved}
		<!-- Reserved by another user -->
		<div class="alert border-0 bg-base-200">
			<IconClock class="size-6 text-info" />
			<div class="flex-1">
				<h3 class="font-semibold">This offer is currently reserved</h3>
				<p class="text-sm text-base-content/70">
					Another user has reserved this offer. Please check back later.
				</p>
			</div>
		</div>
	{:else}
		<!-- Available to reserve -->
		<button onclick={() => (showReservationDialog = true)} class="btn w-full btn-lg btn-primary">
			<IconCheckmark class="size-6" />
			Reserve This Offer
		</button>
	{/if}
{:else if data.isOwner}
	<!-- Owner controls -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
		<button onclick={handleEdit} class="btn btn-outline btn-lg">
			<IconEdit class="size-5" />
			Edit Offer
		</button>
		<button onclick={handleDelete} class="btn btn-outline btn-lg btn-error">
			<IconDelete class="size-5" />
			Delete Offer
		</button>
	</div>

	{#if data.isReserved}
		<div class="mt-4 alert alert-info">
			<IconClock class="size-5" />
			<span>This offer is currently reserved by a user</span>
		</div>
	{/if}
{:else if !data.isLoggedIn}
	<!-- Not logged in -->
	<div class="alert border-0 bg-base-200">
		<div class="flex-1">
			<div class="flex items-start gap-3">
				<IconCheckmark class="size-6 text-primary" />
				<div>
					<h3 class="font-semibold">Want to reserve this offer?</h3>
					<p class="text-sm text-base-content/70">Log in with your user account to get started</p>
				</div>
			</div>
		</div>
		<a href="/login" class="btn btn-primary">Log In</a>
	</div>
{:else if !data.offer.isActive}
	<!-- Inactive offer -->
	<div class="alert alert-warning">
		<span>This offer is currently inactive and cannot be reserved</span>
	</div>
{/if}

<!-- Reservation Dialog -->
{#if showReservationDialog}
	<div class="modal-open modal">
		<div class="modal-box">
			<h3 class="mb-4 text-lg font-bold">Choose Pickup Date</h3>

			<form
				method="POST"
				action="?/reserve"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
						isSubmitting = false;
						showReservationDialog = false;
					};
				}}
			>
				<div class="space-y-4">
					{#if data.offer.isRecurring}
						<!-- Recurring offer: only date picker -->
						<div class="form-control">
							<label for="pickupDate" class="label">
								<span class="label-text">Pickup Date</span>
							</label>
							<input
								type="date"
								id="pickupDate"
								name="pickupDate"
								bind:value={pickupDate}
								required
								class="input-bordered input"
							/>
							<label class="label">
								<span class="label-text-alt text-base-content/70">
									Pickup time: {formatTime(data.offer.pickupTimeFrom)} - {formatTime(
										data.offer.pickupTimeUntil
									)}
								</span>
							</label>
						</div>
					{:else}
						<!-- Non-recurring offer: just date picker, times are fixed -->
						<div class="mb-2 alert alert-info">
							<IconClock class="size-5" />
							<span class="text-sm">
								Available today from {formatTime(data.offer.pickupTimeFrom)} to {formatTime(
									data.offer.pickupTimeUntil
								)}
							</span>
						</div>

						<div class="form-control">
							<label for="pickupDate" class="label">
								<span class="label-text">Pickup Date</span>
							</label>
							<input
								type="date"
								id="pickupDate"
								name="pickupDate"
								bind:value={pickupDate}
								required
								class="input-bordered input"
							/>
							<label class="label">
								<span class="label-text-alt text-base-content/70">
									You can pick up between {formatTime(data.offer.pickupTimeFrom)} - {formatTime(
										data.offer.pickupTimeUntil
									)}
								</span>
							</label>
						</div>
					{/if}
				</div>

				<div class="modal-action">
					<button
						type="button"
						onclick={() => (showReservationDialog = false)}
						disabled={isSubmitting}
						class="btn"
					>
						Cancel
					</button>
					<button type="submit" disabled={isSubmitting} class="btn btn-primary">
						{#if isSubmitting}
							<span class="loading loading-md loading-spinner"></span>
							Processing...
						{:else}
							Confirm Reservation
						{/if}
					</button>
				</div>
			</form>
		</div>
		<button
			class="modal-backdrop"
			onclick={() => (showReservationDialog = false)}
			disabled={isSubmitting}
		>
			Close
		</button>
	</div>
{/if}
