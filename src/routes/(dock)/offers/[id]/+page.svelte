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
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconGift from '~icons/fluent/gift-24-regular';
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

		minDate = tomorrow.toISOString().slice(0, 10);
		pickupDate = tomorrow.toISOString().slice(0, 10);

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

	const formatTime = (timeStr: string) => {
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
		alert('Delete functionality to be implemented');
	};
</script>

<!-- Business Header -->
<div class="rounded-2xl bg-base-100 p-6 shadow-sm">
	<div class="flex items-center gap-4">
		<div class="h-16 w-16 overflow-hidden rounded-xl border border-base-300 bg-base-200">
			<img
				src={getLogoUrl(data.logo.key)}
				alt={data.business.name}
				class="h-full w-full object-cover"
			/>
		</div>
		<div class="flex-1">
			<div
				class="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide text-base-content/60 uppercase"
			>
				<IconStore class="size-3.5" />
				<span>{data.business.name}</span>
			</div>
			{#if data.location}
				<a
					href="/locations/{data.location.id}"
					class="text-xl font-bold text-base-content hover:text-primary"
				>
					{data.location.name}
				</a>
			{:else}
				<h2 class="text-xl font-bold text-base-content">All Locations</h2>
			{/if}
		</div>
	</div>
</div>

<!-- Hero Section -->
<div class="rounded-2xl bg-base-100 p-6 shadow-sm">
	<div class="flex flex-wrap items-start justify-between gap-6">
		<div class="flex-1 space-y-3">
			<div class="flex flex-wrap items-center gap-2">
				<div class="badge gap-1.5 px-3 py-3 font-semibold badge-primary">
					<IconGift class="size-3.5" />
					Surprise Bag
				</div>
				{#if data.offer.isRecurring}
					<div class="badge gap-1.5 px-3 py-3 font-semibold badge-secondary">
						<IconRepeat class="size-3.5" />
						Daily
					</div>
				{/if}
			</div>

			<h1 class="text-3xl leading-tight font-bold text-base-content lg:text-4xl">
				{data.offer.name}
			</h1>

			<p class="max-w-2xl text-base leading-relaxed text-base-content/70">
				{data.offer.description}
			</p>
		</div>

		<div class="flex flex-col items-end gap-2">
			<div class="text-right">
				<div class="text-lg font-semibold text-base-content/50 line-through">
					{formatPrice(data.offer.originalValue, data.offer.currency)}
				</div>
				<div class="text-4xl font-bold text-primary lg:text-5xl">
					{formatPrice(data.offer.price, data.offer.currency)}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Pickup Details -->
<div class="grid gap-4 lg:grid-cols-2">
	<!-- Location -->
	{#if data.location}
		<div class="rounded-2xl bg-base-100 p-5 shadow-sm">
			<div class="mb-4 flex items-center gap-2">
				<div class="rounded-lg bg-primary/10 p-2">
					<IconMapPin class="size-5 text-primary" />
				</div>
				<h3 class="text-lg font-bold text-base-content">Pickup Location</h3>
			</div>

			<a
				href={getGoogleMapsUrl(data.location.latitude, data.location.longitude)}
				target="_blank"
				rel="noopener noreferrer"
				class="group block rounded-xl bg-base-200 p-4 transition-all hover:bg-base-300"
			>
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1 space-y-0.5">
						<p class="font-semibold text-base-content">{data.location.address}</p>
						<p class="text-sm font-medium text-base-content/70">
							{data.location.zipCode}
							{data.location.city}
						</p>
					</div>
					<div
						class="rounded-full bg-primary/10 p-1.5 transition-all group-hover:bg-primary group-hover:text-primary-content"
					>
						<IconArrowRight class="size-4" />
					</div>
				</div>
			</a>
		</div>
	{:else}
		<div class="rounded-2xl bg-base-100 p-5 shadow-sm">
			<div class="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
				<div class="rounded-lg bg-primary/20 p-2">
					<IconStore class="size-5 text-primary" />
				</div>
				<div>
					<h3 class="font-semibold">All Locations</h3>
					<p class="text-xs font-medium text-base-content/70">Can be picked up at any location</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Pickup Time -->
	<div class="rounded-2xl bg-base-100 p-5 shadow-sm">
		<div class="mb-4 flex items-center gap-2">
			<div class="rounded-lg bg-primary/10 p-2">
				<IconClock class="size-5 text-primary" />
			</div>
			<h3 class="text-lg font-bold text-base-content">Pickup Time</h3>
		</div>

		<div class="space-y-3">
			<div class="rounded-xl bg-base-200 p-4">
				<p class="text-2xl font-bold text-base-content">
					{formatTime(data.offer.pickupTimeFrom)} - {formatTime(data.offer.pickupTimeUntil)}
				</p>
				{#if data.offer.isRecurring}
					<p class="mt-1 text-xs font-medium text-base-content/60">Daily availability</p>
				{/if}
			</div>

			{#if data.offer.validUntil}
				<div class="rounded-xl bg-base-200 p-4">
					<div
						class="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-base-content/60 uppercase"
					>
						<IconCalendar class="size-3.5" />
						Valid Until
					</div>
					<p class="text-xl font-bold text-base-content">
						{formatDate(data.offer.validUntil)}
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Action Messages -->
{#if form?.error}
	<div class="rounded-xl border border-error bg-error/10 p-4">
		<div class="flex items-center gap-2">
			<IconCancel class="size-5 text-error" />
			<span class="font-semibold text-error">{form.error}</span>
		</div>
	</div>
{/if}

<!-- Reservation Status / Actions -->
{#if data.userReservation}
	<!-- User's Active Reservation -->
	<a
		href="/reservations/{data.userReservation.id}"
		class="block rounded-xl border-2 border-success bg-success/5 p-5 transition-all hover:border-success/70"
	>
		<div class="flex items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-success p-2">
					<IconCheckmark class="size-6 text-success-content" />
				</div>
				<div>
					<h3 class="text-lg font-bold text-base-content">You've Reserved This Surprise Bag!</h3>
					<p class="text-sm font-medium text-base-content/70">View your reservation details</p>
				</div>
			</div>
			<IconArrowRight class="size-5 text-base-content/40" />
		</div>
	</a>
{:else if data.isUser && data.offer.isActive}
	{#if data.isReserved}
		<!-- Reserved by Another User -->
		<div class="rounded-xl border border-warning bg-warning/5 p-5">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-warning/20 p-2">
					<IconClock class="size-6 text-warning" />
				</div>
				<div>
					<h3 class="text-lg font-semibold">Currently Reserved</h3>
					<p class="text-sm font-medium text-base-content/70">
						This surprise bag is reserved. Check back later!
					</p>
				</div>
			</div>
		</div>
	{:else}
		<!-- Available to Reserve -->
		<button
			onclick={() => (showReservationDialog = true)}
			class="btn w-full rounded-xl text-lg font-bold transition-all btn-lg btn-primary hover:scale-[1.02]"
		>
			<IconGift class="size-6" />
			Reserve Surprise Bag
		</button>
	{/if}
{:else if data.isOwner}
	<!-- Owner Controls -->
	<div class="rounded-2xl bg-base-100 p-5 shadow-sm">
		{#if data.isReserved}
			<div class="mt-4 rounded-xl border border-info bg-info/5 p-4">
				<div class="flex items-center gap-2">
					<IconClock class="size-5 text-info" />
					<span class="font-semibold">Currently reserved by a user</span>
				</div>
			</div>
		{:else}
			<!-- todo: also make sure that an offer can only deleted if it's not reserved on the server side -->
			<button onclick={handleDelete} class="btn rounded-xl font-semibold btn-outline btn-error">
				<IconDelete class="size-5" />
				Delete Offer
			</button>
		{/if}
	</div>
{:else if !data.offer.isActive}
	<!-- Inactive Offer -->
	<div class="rounded-xl border border-warning bg-warning/5 p-5">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-warning/20 p-2">
				<IconInfo class="size-6 text-warning" />
			</div>
			<span class="font-semibold">This offer is currently inactive</span>
		</div>
	</div>
{/if}

<!-- Reservation Dialog -->
{#if showReservationDialog}
	<div class="modal-open modal">
		<div class="modal-box max-w-md rounded-2xl">
			<h3 class="mb-6 text-2xl font-bold">Choose Pickup Date</h3>

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
					<div class="form-control">
						<label for="pickupDate" class="label">
							<span class="label-text font-semibold">Select Pickup Date</span>
						</label>
						<input
							type="date"
							id="pickupDate"
							name="pickupDate"
							bind:value={pickupDate}
							min={minDate}
							max={maxDate}
							required
							class="input-bordered input rounded-lg font-medium"
						/>
						<label class="label">
							<span
								class="label-text-alt flex items-center gap-1.5 font-medium text-base-content/70"
							>
								<IconClock class="size-3.5" />
								Pickup: {formatTime(data.offer.pickupTimeFrom)} - {formatTime(
									data.offer.pickupTimeUntil
								)}
							</span>
						</label>
					</div>

					<div class="rounded-lg border border-info bg-info/5 p-4">
						<div class="flex items-start gap-2">
							<IconGift class="size-4 shrink-0 text-info" />
							<div class="text-sm">
								<p class="font-semibold">About Surprise Bags</p>
								<p class="font-medium text-base-content/70">
									Contents vary daily. Pick up during the selected time window.
								</p>
							</div>
						</div>
					</div>
				</div>

				<div class="modal-action">
					<button
						type="button"
						onclick={() => (showReservationDialog = false)}
						disabled={isSubmitting}
						class="btn rounded-lg font-semibold btn-ghost"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="btn rounded-lg font-semibold btn-primary"
					>
						{#if isSubmitting}
							<span class="loading loading-sm loading-spinner"></span>
							Processing...
						{:else}
							<IconCheckmark class="size-5" />
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
