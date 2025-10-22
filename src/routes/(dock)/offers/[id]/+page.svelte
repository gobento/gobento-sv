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
	import { goto } from '$app/navigation';

	let { data, form } = $props();

	let isSubmitting = $state(false);

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

{#if data.location}
	<div class="relative overflow-hidden rounded-2xl bg-base-300">
		<!-- Location Image Background (clickable to Google Maps) -->
		{#if data.location.imageId}
			<a
				href={getGoogleMapsUrl(data.location.latitude, data.location.longitude)}
				target="_blank"
				rel="noopener noreferrer"
				class="group relative block h-48 overflow-hidden"
			>
				<img
					src={getLogoUrl(data.location.imageId)}
					alt={data.location.name}
					class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
				/>
				<div
					class="absolute inset-0 bg-linear-to-b from-transparent to-base-300/80 transition-opacity duration-300 group-hover:to-base-300/60"
				></div>
				<div
					class="absolute right-4 bottom-4 flex items-center gap-2 rounded-full bg-base-100 px-4 py-2 text-sm font-medium transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-content"
				>
					<IconMapPin class="size-4" />
					Open in Maps
				</div>
			</a>
		{:else}
			<a
				href={getGoogleMapsUrl(data.location.latitude, data.location.longitude)}
				target="_blank"
				rel="noopener noreferrer"
				class="group relative block h-48 bg-base-300"
			>
				<div class="flex h-full items-center justify-center">
					<IconMapPin class="size-16 text-base-content/20" />
				</div>
				<div
					class="absolute right-4 bottom-4 flex items-center gap-2 rounded-full bg-base-100 px-4 py-2 text-sm font-medium transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-content"
				>
					<IconMapPin class="size-4" />
					Open in Maps
				</div>
			</a>
		{/if}

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

		<h1 class="mb-3 text-4xl font-bold text-base-content">{data.offer.name}</h1>

		<!-- Offer Description -->
		<div class="prose mb-6 max-w-none">
			<p class="text-base leading-relaxed whitespace-pre-wrap text-base-content/80">
				{data.offer.description}
			</p>
		</div>

		<!-- Location Details (clickable to location page) -->
		<a
			href="/locations/{data.location.id}"
			class="group block px-6 pt-4 pb-6 transition-colors duration-200 hover:bg-base-200/50"
		>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="mb-1 flex items-center gap-2">
						<h3 class="text-lg font-semibold text-base-content">
							{data.location.name}
						</h3>
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
	</div>
{:else}
	<div class="flex items-center gap-3 rounded-2xl bg-base-300 p-6">
		<IconStore class="size-6 text-base-content/70" />
		<div>
			<p class="font-medium text-base-content">Available at all locations</p>
			<p class="text-sm text-base-content/70">
				This offer can be claimed at any of this business's locations
			</p>
		</div>
	</div>
{/if}

<!-- Offer Header -->
<div class="mb-6">
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
		<form
			method="POST"
			action="?/reserve"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}}
		>
			<button type="submit" disabled={isSubmitting} class="btn w-full btn-lg btn-primary">
				{#if isSubmitting}
					<span class="loading loading-md loading-spinner"></span>
					Processing...
				{:else}
					<IconCheckmark class="size-6" />
					Reserve This Offer
				{/if}
			</button>
		</form>
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
			<IconCheckmark class="size-6 text-primary" />
			<div>
				<h3 class="font-semibold">Want to reserve this offer?</h3>
				<p class="text-sm text-base-content/70">Log in with your user account to get started</p>
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
