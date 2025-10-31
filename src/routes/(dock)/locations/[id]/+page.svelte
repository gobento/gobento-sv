<!-- src/routes/(dock)/locations/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconMapPin from '~icons/fluent/location-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconHeartFilled from '~icons/fluent/heart-24-filled';
	import LocationCard from '$lib/components/LocationCard.svelte';
	import OptimizedLogoImage from '$lib/components/images/OptimizedLogoImage.svelte';
	import OptimizedLocationImage from '$lib/components/images/OptimizedLocationImage.svelte';

	let { data, form } = $props();

	// State for favorite - initialize from server data
	let isFavorite = $state(data.isFavorite ?? false);
	let isTogglingFavorite = $state(false);
</script>

<!-- Location Header with Background Image -->
<div class="card mb-8 overflow-hidden border-2 border-base-300 bg-base-100">
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

<!-- Offers Section -->
<div class="mb-8">
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
		<div class="grid gap-5">
			{#each data.offers as offer}
				<div
					class="card border border-base-300 bg-base-100 transition-colors duration-200 hover:border-primary/50"
				>
					<div class="card-body p-6">
						<div class="flex items-start justify-between gap-6">
							<div class="min-w-0 flex-1">
								<div class="mb-3 flex items-center gap-3">
									<h3 class="text-xl font-bold">{offer.name}</h3>
									{#if offer.isActive}
										<span class="badge badge-sm badge-success">Active</span>
									{:else}
										<span class="badge badge-ghost badge-sm">Inactive</span>
									{/if}
								</div>
								<p class="mb-4 leading-relaxed text-base-content/70">{offer.description}</p>
								<div class="flex items-center gap-6">
									<div class="text-xl font-bold text-primary">
										{new Intl.NumberFormat('en-US', {
											style: 'currency',
											currency: offer.currency
										}).format(offer.price)}
									</div>
									<span class="text-sm font-medium text-base-content/50">
										Created {new Date(offer.createdAt).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}
									</span>
								</div>
							</div>
							<a href="/offers/{offer.id}" class="btn gap-2 btn-outline btn-sm">
								View Details
								<span class="text-lg">→</span>
							</a>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
