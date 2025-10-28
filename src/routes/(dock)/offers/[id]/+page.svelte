<!-- src/routes/(dock)/offers/[id]/+page.svelte -->
<script lang="ts">
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconStore from '~icons/fluent/building-retail-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconCancel from '~icons/fluent/dismiss-circle-24-regular';

	import PaymentModal from './PaymentModal.svelte';
	import { formatDate, formatTime } from '$lib/util.js';
	import LocationCard from '$lib/components/LocationCard.svelte';
	import OfferStatusCard from './OfferStatusCard.svelte';

	let { data, form } = $props();

	let showPaymentModal = $state(false);
	let pickupDate = $state('');
	let minDate = $state('');
	let maxDate = $state('');

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

	const formatPrice = (price: number, country: string) => {
		if (country === 'Iran') {
			return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
		}
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: 'EUR'
		}).format(price);
	};

	const getBusinessTypeDescription = (businessType: string) => {
		const descriptions = {
			bakery:
				'This surprise bag contains a selection of fresh baked goods such as bread, rolls, pastries, cakes, and other delicious treats from our daily production.',
			restaurant:
				'This surprise bag contains a variety of restaurant meals including main courses, side dishes, and appetizers prepared fresh in our kitchen.',
			cafe: 'This surprise bag contains café favorites like sandwiches, wraps, salads, baked goods, and other fresh items from our daily menu.',
			grocery:
				'This surprise bag contains a mix of grocery items such as fresh produce, dairy products, pantry staples, and seasonal products.',
			supermarket:
				'This surprise bag contains a variety of supermarket products including fresh goods, packaged items, dairy, and bakery products.',
			hotel:
				'This surprise bag contains hotel buffet items, breakfast goods, prepared meals, and fresh ingredients from our kitchen.',
			catering:
				'This surprise bag contains catering selections including prepared meals, party platters, side dishes, and desserts.',
			other:
				'This surprise bag contains a variety of quality products and fresh items selected from our daily offerings.'
		};
		return descriptions[businessType] || descriptions.other;
	};

	const handleDelete = async () => {
		if (!confirm('Are you sure you want to delete this offer?')) return;
		alert('Delete functionality to be implemented');
	};

	const handleReserve = () => {
		showPaymentModal = true;
	};
</script>

<!-- Hero Section with Price -->
<div class="flex flex-wrap items-start justify-between gap-6">
	<div class="flex-1 space-y-4">
		<h1 class="text-3xl leading-tight font-bold lg:text-3xl">
			{data.offer.name}
		</h1>

		<div class="text-lg leading-relaxed text-base-content/70">
			{getBusinessTypeDescription(data.business.businessType)}
		</div>
	</div>

	<div class="flex flex-col items-end gap-1">
		<div class="text-base text-base-content/50 line-through">
			{formatPrice(data.offer.displayOriginalValue, data.business.country)}
		</div>
		<div class="text-3xl font-bold text-primary lg:text-3xl">
			{formatPrice(data.offer.displayPrice, data.business.country)}
		</div>
	</div>
</div>

<!-- Availability Info -->
<div class="rounded-lg bg-base-200 p-4">
	<div class="flex flex-wrap items-center gap-x-8 gap-y-4">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-primary/10 p-2.5">
				<IconClock class="size-6 text-primary" />
			</div>
			<div>
				<div class="mb-1 text-xs font-medium tracking-wide text-base-content/60 uppercase">
					Pickup Time
				</div>
				<div class="text-lg font-bold text-primary">
					{formatTime(data.offer.pickupTimeFrom)} - {formatTime(data.offer.pickupTimeUntil)}
				</div>
			</div>
		</div>

		{#if data.offer.isRecurring}
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-secondary/10 p-2.5">
					<IconRepeat class="size-6 text-secondary" />
				</div>
				<div>
					<div class="mb-1 text-xs font-medium tracking-wide text-base-content/60 uppercase">
						Availability
					</div>
					<div class="text-lg font-bold text-secondary">
						{#if data.offer.validUntil}
							Available daily until {formatDate(data.offer.validUntil)}
						{:else}
							Available daily
						{/if}
					</div>
				</div>
			</div>
		{:else if data.offer.validUntil}
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-warning/10 p-2.5">
					<IconCalendar class="size-6 text-warning" />
				</div>
				<div>
					<div class="mb-1 text-xs font-medium tracking-wide text-base-content/60 uppercase">
						Available Until
					</div>
					<div class="text-lg font-bold text-warning">
						{formatDate(data.offer.validUntil)}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

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
	<div class="rounded-lg border border-base-300 bg-base-100 p-5">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-primary/10 p-2.5">
				<IconStore class="size-6 text-primary" />
			</div>
			<div>
				<h3 class="text-lg font-semibold">All Locations</h3>
				<p class="text-sm text-base-content/70">Can be picked up at any location</p>
			</div>
		</div>
	</div>
{/if}

<!-- Business Info -->
<div class="flex items-center gap-4 rounded-lg border border-base-300 bg-base-100 p-5">
	<div class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-base-300">
		<img src={data.logo.url} alt={data.business.name} class="h-full w-full object-cover" />
	</div>
	<div class="min-w-0 flex-1">
		<div
			class="mb-1 flex items-center gap-2 text-xs font-medium tracking-wide text-base-content/60 uppercase"
		>
			<IconStore class="h-4 w-4" />
			<span>Offered by</span>
		</div>
		{#if data.location}
			<a
				href="/locations/{data.location.id}"
				class="block truncate text-xl font-bold hover:text-primary"
			>
				{data.business.name} - {data.location.name}
			</a>
		{:else}
			<h2 class="truncate text-xl font-bold">
				{data.business.name}
			</h2>
		{/if}
	</div>
</div>

<!-- Error Message -->
{#if form?.error}
	<div class="rounded-lg border border-error bg-error/10 p-4">
		<div class="flex items-center gap-2">
			<IconCancel class="size-5 text-error" />
			<span class="font-medium text-error">{form.error}</span>
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
		price: data.offer.displayPrice,
		currency: data.business.country === 'Iran' ? 'IRR' : 'EUR'
	}}
	businessPaymentMethods={data.businessPaymentMethods}
	{pickupDate}
	onClose={() => (showPaymentModal = false)}
/>
