<!-- src/routes/(dock)/offers/[id]/+page.svelte -->
<script lang="ts">
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconStore from '~icons/fluent/building-retail-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconCancel from '~icons/fluent/dismiss-circle-24-regular';
	import IconGift from '~icons/fluent/gift-24-regular';

	import PaymentModal from '$lib/components/PaymentModal.svelte';
	import { formatDate, formatTime } from '$lib/util.js';
	import LocationCard from '$lib/components/LocationCard.svelte';
	import OfferStatusCard from './OfferStatusCard.svelte';

	let { data, form } = $props();

	let showPaymentModal = $state(false);
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

	const handleDelete = async () => {
		if (!confirm('Are you sure you want to delete this offer?')) return;
		alert('Delete functionality to be implemented');
	};

	const handleReserve = () => {
		showPaymentModal = true;
	};
</script>

<!-- Business Header -->
<div>
	<div class="flex items-center gap-4">
		<div class="size-16 overflow-hidden rounded-xl border border-base-300 bg-base-200">
			<img src={data.logo.url} alt={data.business.name} class="h-full w-full object-cover" />
		</div>
		<div class="flex-1">
			<div
				class="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide text-base-content/60 uppercase"
			>
				<IconStore class="size-4" />
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
<div>
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex-1 space-y-3">
			<div class="flex flex-wrap items-center gap-2">
				<div class="badge gap-1.5 px-3 py-3 font-semibold badge-primary">
					<IconGift class="size-4" />
					Surprise Bag
				</div>
				{#if data.offer.isRecurring}
					<div class="badge gap-1.5 px-3 py-3 font-semibold badge-secondary">
						<IconRepeat class="size-4" />
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
		<div class="rounded-2xl bg-base-100 p-4">
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
	<div>
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
						<IconCalendar class="size-4" />
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

<!-- Status Card -->
<OfferStatusCard
	isUser={data.isUser}
	isOwner={data.isOwner}
	offer={data.offer}
	userReservation={data.userReservation}
	isReserved={data.isReserved}
	onReserve={handleReserve}
	onDelete={handleDelete}
/>

<!-- Payment Modal -->
<PaymentModal
	show={showPaymentModal}
	offer={{
		id: data.offer.id,
		name: data.offer.name,
		price: data.offer.price,
		currency: data.offer.currency
	}}
	{pickupDate}
	onClose={() => (showPaymentModal = false)}
/>
