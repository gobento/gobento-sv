<!-- src/routes/(dock)/locations/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconMapPin from '~icons/fluent/location-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconHeartFilled from '~icons/fluent/heart-24-filled';

	let { data, form } = $props();

	// State for favorite - initialize from server data
	let isFavorite = $state(data.isFavorite ?? false);
	let isTogglingFavorite = $state(false);

	const getLogoUrl = (key: string) => {
		return `/api/files/${key}`;
	};

	const getLocationImageUrl = (key: string | null) => {
		if (!key) return null;
		return `/api/files/${key}`;
	};
</script>

<!-- Location Header with Background Image -->
<div class="card mb-8 overflow-hidden border-2 border-base-300 bg-base-100">
	<!-- Background Image Section -->
	<div class="relative h-64 bg-linear-to-br from-primary/20 via-primary/10 to-base-200">
		{#if data.location.imageId && data.locationImage}
			<img
				src={getLogoUrl(data.locationImage.key)}
				alt={data.location.name}
				class="absolute inset-0 h-full w-full object-cover"
			/>
			<div class="absolute inset-0 bg-linear-to-t from-base-100/60 to-transparent"></div>
		{:else}
			<!-- Placeholder gradient background -->
			<div class="absolute inset-0 bg-linear-to-br from-primary/30 to-base-300/50"></div>
		{/if}

		<!-- Business Logo Overlay -->
		<div class="absolute bottom-0 left-8 translate-y-1/2">
			<div class="avatar">
				<div class="h-32 w-32 rounded-2xl border-4 border-base-100 bg-base-100 shadow-xl">
					{#if data.business?.logo}
						<img src={getLogoUrl(data.business.logo.key)} alt={data.business.name} />
					{:else}
						<div class="flex h-full w-full items-center justify-center bg-primary">
							<IconLocation class="h-16 w-16 text-primary-content" />
						</div>
					{/if}
				</div>
			</div>
		</div>

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
				class="absolute top-4 right-4"
			>
				<button
					type="submit"
					disabled={isTogglingFavorite}
					class="btn btn-circle border-0 bg-base-100/90 shadow-lg hover:bg-base-100"
					class:loading={isTogglingFavorite}
					aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
				>
					{#if !isTogglingFavorite}
						{#if isFavorite}
							<IconHeartFilled class="h-6 w-6 text-error" />
						{:else}
							<IconHeart class="h-6 w-6" />
						{/if}
					{/if}
				</button>
			</form>
		{/if}
	</div>

	<!-- Content Section -->
	<div class="card-body p-8 pt-20">
		<div class="flex items-start justify-between gap-6">
			<div class="min-w-0 flex-1">
				<!-- Business Name (if available) -->
				{#if data.business?.name}
					<p class="mb-2 text-sm font-medium text-primary">{data.business.name}</p>
				{/if}

				<h1 class="mb-4 text-4xl font-bold tracking-tight">{data.location.name}</h1>

				<!-- Address Section -->
				<div class="mb-6 flex items-start gap-3">
					<IconMapPin class="mt-0.5 size-5 shrink-0 text-base-content/60" />
					<div class="space-y-1 text-base text-base-content/70">
						<p class="font-medium">{data.location.address}</p>
						<p>
							{data.location.city}{#if data.location.state}, {data.location.state}{/if}
							{#if data.location.zipCode}
								{data.location.zipCode}
							{/if}
						</p>
						<p>{data.location.country}</p>
					</div>
				</div>

				<!-- Stats -->
				<div class="flex flex-wrap items-center gap-6">
					<div class="flex items-center gap-2 rounded-lg bg-base-200 px-4 py-2.5">
						<IconTag class="size-5 text-base-content/70" />
						<span class="text-base font-semibold">
							{data.offers.length}
							{data.offers.length === 1 ? 'offer' : 'offers'}
						</span>
					</div>
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
					<a href="/locations/{data.location.id}/edit" class="btn gap-2.5 btn-outline">
						<IconEdit class="size-5" />
						Edit Location
					</a>
					<a href="/offers/new?locationId={data.location.id}" class="btn gap-2.5 btn-primary">
						<IconAdd class="size-5" />
						Create Offer
					</a>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Offers Section -->
<div class="mb-8">
	<div class="mb-6 flex items-center justify-between">
		<h2 class="text-3xl font-bold">Offers at this Location</h2>
	</div>

	{#if data.offers.length === 0}
		<!-- Empty State -->
		<div class="card border border-base-300 bg-base-100">
			<div class="card-body items-center py-16 text-center">
				<div class="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-base-200">
					<IconTag class="h-10 w-10 text-base-content/40" />
				</div>
				<h3 class="mb-2 text-2xl font-bold">No offers yet</h3>
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
									<h3 class="text-2xl font-bold">{offer.name}</h3>
									{#if offer.isActive}
										<span class="badge badge-sm badge-success">Active</span>
									{:else}
										<span class="badge badge-ghost badge-sm">Inactive</span>
									{/if}
								</div>
								<p class="mb-4 leading-relaxed text-base-content/70">{offer.description}</p>
								<div class="flex items-center gap-6">
									<div class="text-2xl font-bold text-primary">
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

<!-- Coordinates Info (for reference) -->
<div class="card border border-base-300 bg-base-200/50">
	<div class="card-body p-6">
		<h3 class="mb-3 text-lg font-bold">Location Coordinates</h3>
		<div class="grid grid-cols-2 gap-4 text-sm">
			<div>
				<span class="text-base-content/60">Latitude:</span>
				<span class="ml-2 font-mono">{data.location.latitude}</span>
			</div>
			<div>
				<span class="text-base-content/60">Longitude:</span>
				<span class="ml-2 font-mono">{data.location.longitude}</span>
			</div>
		</div>
	</div>
</div>
