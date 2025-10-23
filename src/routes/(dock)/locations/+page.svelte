<!-- src/routes/(dock)/locations/+page.svelte -->
<script lang="ts">
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconBuilding from '~icons/fluent/building-24-regular';

	let { data } = $props();

	let searchQuery = $state('');

	const filteredLocations = $derived(
		data.locations.filter((location) => {
			const query = searchQuery.toLowerCase().trim();
			if (!query) return true;

			return (
				location.name.toLowerCase().includes(query) ||
				location.address.toLowerCase().includes(query) ||
				location.city.toLowerCase().includes(query) ||
				location.state?.toLowerCase().includes(query) ||
				location.country.toLowerCase().includes(query)
			);
		})
	);
</script>

<!-- Header -->
<div class="mb-8">
	<div class="mb-2 flex items-center gap-3">
		<IconBuilding class="size-6 text-primary" />
		<h1 class="text-2xl font-semibold">Business Locations</h1>
	</div>
	<p class="text-base-content/60">Manage your physical business locations</p>
</div>

{#if data.locations.length > 0}
	<div class="mb-6 flex flex-col gap-3 sm:flex-row">
		<!-- Search -->
		<div class="relative flex-1">
			<IconSearch class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-base-content/40" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search locations..."
				class="input-bordered input w-full pl-10"
			/>
		</div>

		<!-- Add Button -->
		<a href="/locations/new" class="btn gap-2 btn-primary">
			<IconAdd class="size-5" />
			<span>Add Location</span>
		</a>
	</div>
{/if}

{#if data.locations.length === 0}
	<!-- Empty State -->
	<div class="rounded-lg border-2 border-dashed border-base-300 bg-base-100 p-12 text-center">
		<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-base-200">
			<IconLocation class="h-8 w-8 text-base-content/40" />
		</div>
		<h2 class="mb-2 text-xl font-semibold">No locations yet</h2>
		<p class="mb-6 text-base-content/60">
			Start by adding your first business location to begin creating and managing offers
		</p>
		<a href="/locations/new" class="btn gap-2 btn-primary">
			<IconAdd class="size-5" />
			Add Your First Location
		</a>
	</div>
{:else if filteredLocations.length === 0}
	<!-- No Results -->
	<div class="rounded-lg border-2 border-dashed border-base-300 bg-base-100 p-12 text-center">
		<IconSearch class="mx-auto mb-3 h-12 w-12 text-base-content/20" />
		<h3 class="mb-1 font-semibold">No locations found</h3>
		<p class="text-sm text-base-content/60">Try adjusting your search</p>
	</div>
{:else}
	<!-- Locations Grid -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each filteredLocations as location}
			<div
				class="rounded-lg border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary"
			>
				<a href="/locations/{location.id}">
					<!-- Header -->
					<div class="mb-4 flex items-start gap-3">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"
						>
							<IconLocation class="size-5 text-primary" />
						</div>
						<div class="min-w-0 flex-1">
							<h3 class="mb-1 leading-tight font-semibold">{location.name}</h3>
						</div>
					</div>

					<!-- Address -->
					<div class="mb-4 space-y-0.5 text-sm text-base-content/60">
						<p>{location.address}</p>
						<p>
							{location.city}{#if location.state}, {location.state}{/if}
							{#if location.zipCode}
								{location.zipCode}{/if}
						</p>
						<p>{location.country}</p>
					</div></a
				>

				<!-- Stats -->
				<div
					class="mb-4 flex items-center gap-4 border-t border-base-300 pt-4 text-xs text-base-content/50"
				>
					<div class="flex items-center gap-1.5">
						<IconTag class="size-4" />
						<span>{location.offerCount} {location.offerCount === 1 ? 'offer' : 'offers'}</span>
					</div>
					<span>•</span>
					<span>
						{new Date(location.createdAt).toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
							year: 'numeric'
						})}
					</span>
				</div>

				<!-- Action Button -->
				<a href="/offers/new?locationId={location.id}" class="btn btn-block gap-2 btn-success">
					<IconAdd class="size-4" />
					Create Offer
				</a>
			</div>
		{/each}
	</div>

	<!-- Universal Offers -->
	{#if data.allLocationsOfferCount > 0}
		<div class="mt-6 rounded-lg border-2 border-info bg-base-100 p-5">
			<div class="mb-4 flex items-start gap-3">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10">
					<IconTag class="size-5 text-info" />
				</div>
				<div class="min-w-0 flex-1">
					<h3 class="mb-1 font-semibold">Universal Offers</h3>
					<p class="text-sm text-base-content/60">
						{data.allLocationsOfferCount}
						{data.allLocationsOfferCount === 1 ? 'offer' : 'offers'} available at all locations
					</p>
				</div>
			</div>
			<a href="/offers" class="btn btn-block gap-2 btn-ghost">
				View All Offers
				<span>→</span>
			</a>
		</div>
	{/if}
{/if}
