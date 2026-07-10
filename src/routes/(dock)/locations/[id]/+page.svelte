<!-- src/routes/(dock)/locations/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconHeartFilled from '~icons/fluent/heart-24-filled';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconBox from '~icons/fluent/box-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';
	import IconWarning from '~icons/fluent/warning-24-regular';
	import LocationCard from '$lib/components/maps/LocationCard.svelte';
	import OptimizedLogoImage from '$lib/components/images/OptimizedLogoImage.svelte';
	import OptimizedLocationImage from '$lib/components/images/OptimizedLocationImage.svelte';
	import ComplaintModal from '$lib/components/ComplaintModal.svelte';
	import { formatDate, formatTime, formatPrice } from '$lib/util';

	let { data, form } = $props();

	// State for favorite - initialize from server data
	let isFavorite = $state(data.isFavorite ?? false);
	let isTogglingFavorite = $state(false);

	let complaintOpen = $state(false);
	const complaintResult = $derived(form && 'complaint' in form ? form.complaint : null);

	// Re-open the modal to show the result after a complaint submission
	$effect(() => {
		if (complaintResult) {
			complaintOpen = true;
		}
	});

	// Construct full URL for og:url
	const baseUrl = 'https://yourapp.com'; // Replace with your actual domain
	const locationUrl = `${baseUrl}/locations/${data.location.id}`;

	// Create description for OG tags
	const locationDescription = `${data.business.name} at ${data.location.address}, ${data.location.city}. ${data.offers.length} ${data.offers.length === 1 ? 'offer' : 'offers'} available.`;
</script>

<svelte:head>
	<title>{data.business.name} - {data.location.name}</title>
	<meta name="description" content={locationDescription} />

	<!-- Open Graph Meta Tags -->
	<meta property="og:title" content="{data.business.name} - {data.location.name}" />
	<meta property="og:site_name" content="YourAppName" />
	<meta property="og:url" content={locationUrl} />
	<meta property="og:description" content={locationDescription} />
	<meta property="og:type" content="business.business" />
	<meta property="og:image" content={data.locationImage.url} />
	<meta property="og:image:alt" content="{data.business.name} location" />

	<!-- Additional Business-specific OG tags -->
	<meta property="business:contact_data:street_address" content={data.location.address} />
	<meta property="business:contact_data:locality" content={data.location.city} />
	<meta property="business:contact_data:region" content={data.location.province} />
	<meta property="business:contact_data:postal_code" content={data.location.zipCode} />
	<meta property="business:contact_data:country_name" content={data.location.country} />
</svelte:head>

<!-- Location Header with Background Image -->
<div class="mb-8 overflow-hidden">
	<!-- Background Image Section -->
	<div class="relative h-64 bg-linear-to-br from-primary/20 via-primary/10 to-base-200">
		<OptimizedLocationImage
			src={data.locationImage.url}
			alt={data.location.name}
			priority={true}
			class="h-full w-full"
		/>
		<div class="absolute inset-0 bg-linear-to-t from-base-100/60 to-transparent"></div>

		<!-- Business Logo Overlay -->
		<div class="absolute bottom-0 left-8 translate-y-1/2">
			<OptimizedLogoImage
				src={data.business.logo.url}
				alt={data.business.name}
				size="md"
				shape="square"
				priority={true}
			/>
		</div>

		<!-- Action Buttons (Top Right) -->
		<div class="absolute top-4 right-4 flex items-center gap-3">
			{#if data.isOwner}
				<a
					href="/locations/{data.location.id}/edit"
					class="btn btn-circle border-0 bg-base-100/90 hover:bg-base-100"
				>
					<IconEdit class="size-6" />
				</a>
			{/if}

			<!-- Report Problem Button -->
			{#if data.isUser}
				<button
					type="button"
					onclick={() => (complaintOpen = true)}
					class="btn btn-circle border-0 bg-base-100/90 hover:bg-base-100"
					aria-label="Report a problem with this location"
				>
					<IconWarning class="size-6" />
				</button>
			{/if}

			<!-- Favorite Button -->
			{#if data.isUser}
				<form
					method="POST"
					action="?/{isFavorite ? 'removeFavorite' : 'addFavorite'}"
					use:enhance={() => {
						isTogglingFavorite = true;
						return async ({ update, result }) => {
							await update();
							if (result.type === 'success') {
								isFavorite = !isFavorite;
							}
							isTogglingFavorite = false;
						};
					}}
				>
					<button
						type="submit"
						disabled={isTogglingFavorite}
						class="btn btn-circle border-0 bg-base-100/90 hover:bg-base-100"
						class:loading={isTogglingFavorite}
						aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
					>
						{#if !isTogglingFavorite}
							{#if isFavorite}
								<IconHeartFilled class="size-6 text-error" />
							{:else}
								<IconHeart class="size-6" />
							{/if}
						{/if}
					</button>
				</form>
			{/if}
		</div>
	</div>

	<!-- Content Section -->
	<div class="card-body p-8 pt-20">
		<div class="flex items-start justify-between gap-6">
			<div class="min-w-0 flex-1">
				<h1 class="mb-4 text-lg font-bold tracking-tight">{data.business.name}</h1>

				<!-- Stats -->
				<div class="flex flex-wrap items-center gap-6">
					<div class="flex items-center gap-2 text-base-content/60">
						<IconCalendar class="size-5" />
						<span class="text-sm font-medium">
							Saving food since {new Date(data.location.createdAt).toLocaleDateString('en-US', {
								month: 'long',
								day: 'numeric',
								year: 'numeric'
							})}
						</span>
					</div>
				</div>
			</div>

			<!-- Action Buttons -->
			{#if data.isOwner}
				<div class="flex shrink-0 items-center gap-3">
					<a href="/offers/new?locationId={data.location.id}" class="btn gap-2.5 btn-primary">
						<IconAdd class="size-5" />
						Create Offer
					</a>
				</div>
			{/if}
		</div>
	</div>
</div>

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

<!-- Offers Section -->
<div class="mb-8 px-6">
	<div class="mb-6 flex items-center justify-between">
		<h2 class="text-xl font-bold">
			{data.offers.length}
			{data.offers.length === 1 ? 'Offer' : 'Offers'} at this Location
		</h2>
	</div>

	{#if data.offers.length === 0}
		<!-- Empty State -->
		<div class="card border border-base-300 bg-base-100">
			<div class="card-body items-center py-16 text-center">
				<div class="mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-base-200">
					<IconTag class="h-10 w-10 text-base-content/40" />
				</div>
				<h3 class="mb-2 text-xl font-bold">No offers yet</h3>
				<p class="mb-8 max-w-md text-base-content/60">
					{#if data.isOwner}
						Create your first offer for this location to start attracting customers
					{:else}
						Check back later for special offers at this location
					{/if}
				</p>
				{#if data.isOwner}
					<a href="/offers/new?locationId={data.location.id}" class="btn gap-2.5 btn-primary">
						<IconAdd class="size-5" />
						Create First Offer
					</a>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Offers Grid -->
		<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.offers as offer (offer.id)}
				{@render offerCard(offer)}
			{/each}
		</div>
	{/if}
</div>

{#snippet offerCard(offer: (typeof data.offers)[number])}
	<a
		href="/offers/{offer.id}"
		class="group flex flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg {offer.isActive
			? ''
			: 'opacity-70'}"
	>
		<!-- Image header -->
		<div class="relative h-44 w-full overflow-hidden">
			<OptimizedLocationImage
				src={offer.imageUrl ?? ''}
				alt={offer.name}
				class="h-full w-full transition-transform duration-300 group-hover:scale-105"
			/>
			<div class="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent"></div>

			<!-- Status badge -->
			<div class="absolute top-3 left-3">
				{#if offer.isActive}
					<span class="badge gap-1 border-none badge-sm badge-success shadow">
						<IconCheckmark class="size-3" />
						{#if offer.validUntil}
							Active until {formatDate(offer.validUntil)}
						{:else}
							Active
						{/if}
					</span>
				{:else}
					<span class="badge border-none badge-sm badge-neutral shadow">Inactive</span>
				{/if}
			</div>

			<!-- Recurring badge -->
			{#if offer.isRecurring}
				<div class="absolute top-3 right-3">
					<span class="badge gap-1 border-none badge-sm badge-info shadow">
						<IconRepeat class="size-3" />
						Recurring
					</span>
				</div>
			{/if}
		</div>

		<!-- Body -->
		<div class="flex flex-1 flex-col p-5">
			<h3 class="leading-tight font-semibold">{offer.name}</h3>
			<p class="mt-1 line-clamp-2 text-sm text-base-content/60">{offer.description}</p>

			<!-- Price -->
			<div class="mt-4 flex items-baseline gap-2">
				<span class="text-2xl font-bold text-success">
					{formatPrice(offer.price, offer.currency)}
				</span>
				{#if offer.originalValue && offer.originalValue > offer.price}
					<span class="text-sm text-base-content/40 line-through">
						{formatPrice(offer.originalValue, offer.currency)}
					</span>
				{/if}
			</div>

			<!-- Details -->
			<div class="mt-4 grid grid-cols-1 gap-2 text-xs text-base-content/60">
				{#if offer.pickupTimeFrom && offer.pickupTimeUntil}
					<div class="flex items-center gap-2">
						<IconClock class="size-4 shrink-0 text-base-content/40" />
						<span
							>Pickup {formatTime(offer.pickupTimeFrom)} – {formatTime(offer.pickupTimeUntil)}</span
						>
					</div>
				{/if}
				{#if offer.quantity}
					<div class="flex items-center gap-2">
						<IconBox class="size-4 shrink-0 text-base-content/40" />
						<span>{offer.quantity} available</span>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div
				class="mt-5 flex items-center justify-between border-t border-base-200 pt-4 text-sm font-medium text-primary"
			>
				<span>View details</span>
				<IconArrowRight class="size-4 transition-transform group-hover:translate-x-1" />
			</div>
		</div>
	</a>
{/snippet}

{#if data.isUser}
	<ComplaintModal
		bind:open={complaintOpen}
		targetType="location"
		targetName={data.location.name}
		result={complaintResult}
	/>
{/if}
