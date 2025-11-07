<!-- src/routes/(dock)/offers/[id]/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconStore from '~icons/fluent/building-retail-24-regular';
	import IconCancel from '~icons/fluent/dismiss-circle-24-regular';
	import IconFluentArrowRight24Filled from '~icons/fluent/arrow-right-24-filled';

	import OfferStatusCard from './OfferStatusCard.svelte';
	import PriceDisplay from '$lib/components/PriceDisplay.svelte';
	import OptimizedLocationImage from '$lib/components/images/OptimizedLocationImage.svelte';
	import OptimizedLogoImage from '$lib/components/images/OptimizedLogoImage.svelte';
	import LocationCard from '$lib/components/maps/LocationCard.svelte';

	let { data, form } = $props();

	let pickupDate = $state(new Date().toISOString().slice(0, 10));
	let minDate = $state('');
	let maxDate = $state('');

	$effect(() => {
		const now = new Date();

		if (data.offer.isRecurring) {
			const tomorrow = new Date(now);
			tomorrow.setDate(tomorrow.getDate() + 1);

			minDate = tomorrow.toISOString().slice(0, 10);
			pickupDate = tomorrow.toISOString().slice(0, 10);

			if (data.offer.validUntil) {
				const validUntilDate = new Date(data.offer.validUntil);
				maxDate = validUntilDate.toISOString().slice(0, 10);
			}
		} else {
			// For one-time offers, pickup is today
			minDate = now.toISOString().slice(0, 10);
			pickupDate = now.toISOString().slice(0, 10);
			maxDate = now.toISOString().slice(0, 10);
		}
	});

	const getBusinessTypeLabel = (businessType: string) => {
		const labels = {
			bakery: 'Bakery',
			restaurant: 'Restaurant',
			cafe: 'Café',
			grocery: 'Grocery Store',
			supermarket: 'Supermarket',
			hotel: 'Hotel',
			catering: 'Catering',
			other: 'Business'
		};
		return labels[businessType] || labels.other;
	};

	const handleDelete = async () => {
		if (!confirm('Are you sure you want to delete this offer?')) return;
		alert('Delete functionality to be implemented');
	};

	const handleReserve = () => {
		goto(`/offers/${data.offer.id}/payment?pickupDate=${pickupDate}`);
	};

	// Construct full URL for og:url
	const baseUrl = 'https://yourapp.com'; // Replace with your actual domain
	const offerUrl = `${baseUrl}/offers/${data.offer.id}`;

	// Format price for display
	const formatPrice = (price: number, country: string) => {
		const currency = country === 'Iran' ? 'IRR' : 'EUR';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(price);
	};

	// Create description for OG tags
	const offerDescription = data.offer.description
		? data.offer.description
		: `${data.offer.name} from ${data.business.name}. Save food and money! Original value ${formatPrice(data.offer.displayOriginalValue, data.business.country)}, now only ${formatPrice(data.offer.displayPrice, data.business.country)}.`;

	// Calculate savings
	const savingsPercent = Math.round(
		((data.offer.displayOriginalValue - data.offer.displayPrice) /
			data.offer.displayOriginalValue) *
			100
	);

	// Determine image for OG
	const ogImage = data.location?.imageUrl || data.logo.url;

	// Create location string
	const locationString = data.location
		? `${data.location.city}, ${data.location.country}`
		: 'Multiple locations';
</script>

<svelte:head>
	<title>{data.offer.name} - {data.business.name}</title>
	<meta name="description" content={offerDescription} />

	<!-- Open Graph Meta Tags -->
	<meta property="og:title" content="{data.offer.name} - Save up to {savingsPercent}%" />
	<meta property="og:site_name" content="YourAppName" />
	<meta property="og:url" content={offerUrl} />
	<meta property="og:description" content={offerDescription} />
	<meta property="og:type" content="product" />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:alt" content="{data.offer.name} at {data.business.name}" />

	<!-- Product-specific OG tags -->
	<meta property="product:price:amount" content={data.offer.displayPrice.toString()} />
	<meta
		property="product:price:currency"
		content={data.business.country === 'Iran' ? 'IRR' : 'EUR'}
	/>
	<meta
		property="product:availability"
		content={data.offer.isActive ? 'in stock' : 'out of stock'}
	/>
	<meta property="product:condition" content="new" />

	<!-- Additional metadata -->
	<meta property="og:locale" content="en_US" />
	{#if data.location}
		<meta property="og:locality" content={data.location.city} />
		<meta property="og:country-name" content={data.location.country} />
	{/if}
</svelte:head>

<!-- Location Photo Header (if location exists) -->
{#if data.location}
	<div
		class="relative -mx-4 -mt-4 mb-6 h-48 overflow-hidden bg-linear-to-br from-primary/20 via-secondary/10 to-accent/10 sm:-mx-6 sm:-mt-6 lg:h-56"
	>
		{#if data.location.imageUrl}
			<OptimizedLocationImage
				src={data.location.imageUrl}
				alt={data.location.name}
				priority={true}
				class="h-full w-full"
			/>
			<div
				class="absolute inset-0 bg-linear-to-t from-base-100 via-base-100/70 to-base-100/20"
			></div>
		{/if}
	</div>
{/if}

<!-- Business Info -->
<a
	href="/locations/{data.location?.id ?? data.business.id}"
	class="group flex cursor-pointer items-center gap-4 p-6 transition-colors"
>
	<OptimizedLogoImage
		src={data.logo.url}
		alt={data.business.name}
		size="md"
		shape="square"
		priority={true}
	/>

	<div class="min-w-0 flex-1">
		{#if data.location}
			<div class="block truncate text-lg font-bold transition-colors group-hover:text-primary">
				{data.business.name} - {data.location.name}
			</div>
		{:else}
			<h2 class="truncate text-lg font-bold">
				{data.business.name}
			</h2>
		{/if}
		<div class="mt-1 text-sm text-base-content/60">
			{getBusinessTypeLabel(data.business.businessType)}
		</div>
	</div>

	<IconFluentArrowRight24Filled
		class="text-xl text-base-content/40 transition-all group-hover:translate-x-1 group-hover:text-primary"
	/>
</a>

<!-- Offer Name -->
<h1 class="px-6 pt-6 text-3xl leading-tight font-bold lg:text-4xl">
	{data.offer.name}
</h1>

<div class="px-6">
	<PriceDisplay
		originalValue={data.offer.displayOriginalValue}
		price={data.offer.displayPrice}
		country={data.business.country}
		paymentFeePercent={data.feePercentage}
		size="lg"
	/>
</div>

<!-- Pickup Location -->
{#if data.location}
	<div class="px-6">
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
	</div>
{:else}
	<div class="flex items-center gap-3 px-6">
		<div class="rounded-lg bg-linear-to-br from-primary/20 to-primary/10 p-2.5">
			<IconStore class="size-6 text-primary" />
		</div>
		<div>
			<h3 class="text-lg font-semibold">All Locations</h3>
			<p class="text-sm text-base-content/70">Can be picked up at any location</p>
		</div>
	</div>
{/if}

<!-- Error Message -->
{#if form?.error}
	<div
		class="mx-6 my-2 rounded-lg border border-error bg-linear-to-br from-error/10 to-error/5 p-4"
	>
		<div class="flex items-center gap-2">
			<IconCancel class="size-5 text-error" />
			<span class="font-medium text-error">{form.error}</span>
		</div>
	</div>
{/if}

<div class="px-6 pt-6">
	<!-- Status Card -->
	<OfferStatusCard
		isUser={data.isUser}
		isOwner={data.isOwner}
		offer={data.offer}
		userReservation={data.userReservation}
		isReserved={data.isReserved}
		isRecurring={data.offer.isRecurring}
		{pickupDate}
		{minDate}
		{maxDate}
		onPickupDateChange={(date) => (pickupDate = date)}
		onReserve={handleReserve}
		onDelete={handleDelete}
	/>
</div>
