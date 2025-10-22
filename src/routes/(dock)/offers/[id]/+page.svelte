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
	import IconTag from '~icons/fluent/tag-24-regular';
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
<div class="rounded-3xl p-8">
	<div class="flex items-center gap-6">
		<div class="h-24 w-24 overflow-hidden rounded-2xl border-2 border-primary/30 bg-base-200">
			<img
				src={getLogoUrl(data.logo.key)}
				alt={data.business.name}
				class="h-full w-full object-cover"
			/>
		</div>
		<div class="flex-1">
			<div
				class="mb-1 flex items-center gap-2 text-sm font-bold tracking-wider text-base-content/50 uppercase"
			>
				<IconStore class="size-4" />
				<span>{data.business.name}</span>
			</div>
			{#if data.location}
				<h2 class="text-2xl font-black text-base-content">{data.location.name}</h2>
			{/if}
		</div>
	</div>
</div>

<!-- Info Grid -->
<div class="grid gap-6 lg:grid-cols-2">
	<!-- Location Card -->
	{#if data.location}
		<div class="rounded-3xl p-8">
			<div class="mb-6 flex items-center gap-3">
				<div class="rounded-xl bg-primary/10 p-3">
					<IconMapPin class="size-7 text-primary" />
				</div>
				<h3 class="text-2xl font-black text-base-content">Pickup Location</h3>
			</div>

			<a
				href={getGoogleMapsUrl(data.location.latitude, data.location.longitude)}
				target="_blank"
				rel="noopener noreferrer"
				class="group block rounded-2xl bg-base-200 p-6 transition-all hover:border-primary"
			>
				<div class="flex items-start justify-between gap-4">
					<div class="flex-1 space-y-1">
						<p class="text-lg font-bold text-base-content">{data.location.address}</p>
						<p class="text-base font-medium text-base-content/70">
							{data.location.zipCode}
							{data.location.city}
							{#if data.location.state}, {data.location.state}{/if}
						</p>
						<p class="text-sm font-medium text-base-content/50">{data.location.country}</p>
					</div>
					<div
						class="rounded-full bg-primary/10 p-2 transition-all group-hover:bg-primary group-hover:text-primary-content"
					>
						<IconArrowRight class="size-6" />
					</div>
				</div>
			</a>
		</div>
	{:else}
		<div class="rounded-3xl p-8">
			<div class="flex items-center gap-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
				<div class="rounded-xl bg-primary/20 p-3">
					<IconStore class="size-8 text-primary" />
				</div>
				<div>
					<h3 class="text-lg font-bold">Available at All Locations</h3>
					<p class="text-sm font-medium text-base-content/70">
						This offer can be claimed at any of this business's locations
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Pickup Information -->
	<div class="rounded-3xl p-8">
		<div class="mb-6 flex items-center gap-3">
			<div class="rounded-xl bg-primary/10 p-3">
				<IconClock class="size-7 text-primary" />
			</div>
			<h3 class="text-2xl font-black text-base-content">Pickup Information</h3>
		</div>

		<div class="space-y-4">
			<div class="rounded-2xl bg-base-200 p-6">
				<div class="mb-2 text-xs font-bold tracking-wider text-base-content/50 uppercase">
					Pickup Hours
				</div>
				<p class="text-4xl font-black text-base-content">
					{formatTime(data.offer.pickupTimeFrom)} - {formatTime(data.offer.pickupTimeUntil)}
				</p>
				<p class="mt-2 text-sm font-medium text-base-content/60">
					{#if data.offer.isRecurring}
						Available daily during these hours
					{:else}
						Available today only
					{/if}
				</p>
			</div>

			{#if data.offer.validUntil}
				<div class="rounded-2xl bg-base-200 p-6">
					<div
						class="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-base-content/50 uppercase"
					>
						<IconCalendar class="size-4" />
						Valid Until
					</div>
					<p class="text-3xl font-black text-base-content">
						{formatDate(data.offer.validUntil)}
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Hero Section -->
<div class="rounded-3xl p-10">
	<div class="flex flex-wrap items-start justify-between gap-6">
		<div class="flex-1 space-y-5">
			<div class="flex flex-wrap items-center gap-3">
				{#if data.offer.isRecurring}
					<div
						class="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-primary/10 px-4 py-2 text-sm font-bold"
					>
						<IconRepeat class="size-4" />
						Recurring Daily
					</div>
				{/if}
			</div>

			<h1 class="text-5xl leading-tight font-black text-base-content lg:text-6xl">
				{data.offer.name}
			</h1>

			<p class="max-w-3xl text-xl leading-relaxed text-base-content/70">
				{data.offer.description}
			</p>
		</div>

		<div class="flex flex-col items-end">
			<span class="text-7xl font-black text-primary lg:text-8xl">
				{formatPrice(data.offer.price, data.offer.currency)}
			</span>
		</div>
	</div>
</div>

<!-- Action Messages -->
{#if form?.error}
	<div class="rounded-2xl border-2 border-error bg-error/10 p-5">
		<div class="flex items-center gap-3">
			<IconCancel class="size-6 text-error" />
			<span class="font-bold text-error">{form.error}</span>
		</div>
	</div>
{/if}

<!-- Reservation Status / Actions -->
{#if data.userReservation}
	<!-- User's Active Reservation -->
	<a
		href="/reservations/{data.userReservation.id}"
		class="block rounded-2xl border-2 border-success bg-success/5 p-6 transition-all hover:border-success/70"
	>
		<div class="flex items-center justify-between gap-4">
			<div class="flex items-center gap-4">
				<div class="rounded-xl bg-success p-3">
					<IconCheckmark class="size-8 text-success-content" />
				</div>
				<div>
					<h3 class="text-xl font-black text-base-content">You've Reserved This Offer!</h3>
					<p class="text-sm font-medium text-base-content/70">View your reservation details</p>
				</div>
			</div>
			<IconArrowRight class="size-6 text-base-content/40" />
		</div>
	</a>
{:else if data.isUser && data.offer.isActive}
	{#if data.isReserved}
		<!-- Reserved by Another User -->
		<div class="rounded-2xl border-2 border-warning bg-warning/5 p-6">
			<div class="flex items-center gap-4">
				<div class="rounded-xl bg-warning/20 p-3">
					<IconClock class="size-8 text-warning" />
				</div>
				<div>
					<h3 class="text-xl font-bold">Currently Reserved</h3>
					<p class="text-sm font-medium text-base-content/70">
						This offer is reserved by another user. Check back later!
					</p>
				</div>
			</div>
		</div>
	{:else}
		<!-- Available to Reserve -->
		<button
			onclick={() => (showReservationDialog = true)}
			class="btn w-full rounded-2xl text-xl font-black transition-all btn-lg btn-primary hover:scale-[1.02]"
		>
			<IconCheckmark class="size-7" />
			Reserve This Offer Now
		</button>
	{/if}
{:else if data.isOwner}
	<!-- Owner Controls -->
	<div class="rounded-3xl p-8">
		<h3 class="mb-6 text-2xl font-black">Manage Offer</h3>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<button onclick={handleEdit} class="btn rounded-2xl font-bold btn-outline btn-lg">
				<IconEdit class="size-6" />
				Edit Offer
			</button>
			<button onclick={handleDelete} class="btn rounded-2xl font-bold btn-outline btn-lg btn-error">
				<IconDelete class="size-6" />
				Delete Offer
			</button>
		</div>

		{#if data.isReserved}
			<div class="mt-6 rounded-2xl border-2 border-info bg-info/5 p-5">
				<div class="flex items-center gap-3">
					<IconClock class="size-6 text-info" />
					<span class="font-bold">This offer is currently reserved by a user</span>
				</div>
			</div>
		{/if}
	</div>
{:else if !data.offer.isActive}
	<!-- Inactive Offer -->
	<div class="rounded-2xl border-2 border-warning bg-warning/5 p-6">
		<div class="flex items-center gap-4">
			<div class="rounded-xl bg-warning/20 p-3">
				<IconInfo class="size-8 text-warning" />
			</div>
			<span class="text-lg font-bold">This offer is currently inactive and cannot be reserved</span>
		</div>
	</div>
{/if}

<!-- Reservation Dialog -->
{#if showReservationDialog}
	<div class="modal-open modal">
		<div class="modal-box max-w-md rounded-3xl">
			<h3 class="mb-8 text-3xl font-black">Choose Pickup Date</h3>

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
				<div class="space-y-6">
					{#if data.offer.isRecurring}
						<div class="form-control">
							<label for="pickupDate" class="label">
								<span class="label-text text-base font-bold">Select Pickup Date</span>
							</label>
							<input
								type="date"
								id="pickupDate"
								name="pickupDate"
								bind:value={pickupDate}
								min={minDate}
								max={maxDate}
								required
								class="input-bordered input input-lg rounded-xl font-semibold"
							/>
							<label class="label">
								<span
									class="label-text-alt flex items-center gap-2 font-medium text-base-content/70"
								>
									<IconClock class="size-4" />
									Pickup: {formatTime(data.offer.pickupTimeFrom)} - {formatTime(
										data.offer.pickupTimeUntil
									)}
								</span>
							</label>
						</div>
					{:else}
						<div class="rounded-xl border-2 border-info bg-info/5 p-5">
							<div class="flex items-start gap-3">
								<IconClock class="size-5 shrink-0 text-info" />
								<div class="text-sm">
									<p class="font-bold">Today's Pickup Window</p>
									<p class="font-medium text-base-content/70">
										{formatTime(data.offer.pickupTimeFrom)} - {formatTime(
											data.offer.pickupTimeUntil
										)}
									</p>
								</div>
							</div>
						</div>

						<div class="form-control">
							<label for="pickupDate" class="label">
								<span class="label-text text-base font-bold">Confirm Pickup Date</span>
							</label>
							<input
								type="date"
								id="pickupDate"
								name="pickupDate"
								bind:value={pickupDate}
								min={minDate}
								max={maxDate}
								required
								class="input-bordered input input-lg rounded-xl font-semibold"
							/>
						</div>
					{/if}
				</div>

				<div class="modal-action">
					<button
						type="button"
						onclick={() => (showReservationDialog = false)}
						disabled={isSubmitting}
						class="btn rounded-xl font-bold btn-ghost"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="btn rounded-xl font-bold btn-lg btn-primary"
					>
						{#if isSubmitting}
							<span class="loading loading-md loading-spinner"></span>
							Processing...
						{:else}
							<IconCheckmark class="size-6" />
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
