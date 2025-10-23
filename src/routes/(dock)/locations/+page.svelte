<!-- src/routes/(dock)/locations/+page.svelte -->
<script lang="ts">
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconMap from '~icons/fluent/map-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';

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
<div class="mb-6">
	<div class="mb-1 flex items-center gap-2">
		<IconMap class="size-5 text-primary" />
		<h1 class="text-xl font-bold">Business Locations</h1>
	</div>
	<p class="pl-7 text-sm text-base-content/60">Manage your physical business locations</p>
</div>

{#if data.locations.length > 0}
	<div class="mb-4 flex flex-col gap-2">
		<!-- Search -->
		<div class="relative">
			<IconSearch class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-base-content/40" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search locations..."
				class="input-bordered input input-sm w-full pl-9"
			/>
		</div>

		<!-- Add Button -->
		<a href="/locations/new" class="btn w-full gap-2 btn-sm btn-primary">
			<IconAdd class="size-4" />
			<span>Add Location</span>
		</a>
	</div>
{/if}

{#if data.locations.length === 0}
	<!-- Empty State -->
	<div class="card border border-base-300 bg-base-100">
		<div class="card-body items-center py-16 text-center">
			<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-base-200">
				<IconLocation class="h-6 w-6 text-base-content/40" />
			</div>
			<h2 class="mb-2 text-lg font-bold">No locations yet</h2>
			<p class="mb-6 max-w-sm text-sm text-base-content/60">
				Start by adding your first business location to begin creating and managing offers
			</p>
			<a href="/locations/new" class="btn gap-2 btn-sm btn-primary">
				<IconAdd class="size-4" />
				Add Your First Location
			</a>
		</div>
	</div>
{:else if filteredLocations.length === 0}
	<!-- No Results -->
	<div class="card border border-base-300 bg-base-100">
		<div class="card-body items-center py-12 text-center">
			<IconSearch class="mb-3 h-10 w-10 text-base-content/20" />
			<h3 class="mb-1 text-base font-semibold">No locations found</h3>
			<p class="text-sm text-base-content/60">Try adjusting your search</p>
		</div>
	</div>
{:else}
	<!-- Locations List -->
	<div class="space-y-3">
		{#each filteredLocations as location}
			<div
				class="card border border-base-300 bg-base-100 transition-colors hover:border-primary/50"
			>
				<div class="card-body p-4">
					<!-- Header -->
					<div class="mb-3 flex items-start gap-2">
						<div
							class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
						>
							<IconLocation class="size-4 text-primary" />
						</div>
						<div class="min-w-0 flex-1">
							<h3 class="mb-2 text-base leading-tight font-bold">{location.name}</h3>
							<div class="text-sm leading-relaxed text-base-content/60">
								<p>{location.address}</p>
								<p>
									{location.city}{#if location.state}, {location.state}{/if}
									{#if location.zipCode}
										{location.zipCode}{/if}
								</p>
								<p>{location.country}</p>
							</div>
						</div>
					</div>

					<!-- Stats -->
					<div class="mb-3 flex items-center gap-3 pl-10.5 text-xs text-base-content/50">
						<div class="flex items-center gap-1.5">
							<IconTag class="size-4" />
							<span>{location.offerCount} {location.offerCount === 1 ? 'offer' : 'offers'}</span>
						</div>
						<span>•</span>
						<span>
							Added {new Date(location.createdAt).toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric',
								year: 'numeric'
							})}
						</span>
					</div>

					<!-- Action Button -->
					<a
						href="/offers/new?locationId={location.id}"
						class="btn w-full gap-2 btn-sm btn-success"
					>
						<IconAdd class="size-4" />
						Create Offer
					</a>
				</div>
			</div>
		{/each}
	</div>

	<!-- Universal Offers -->
	{#if data.allLocationsOfferCount > 0}
		<div class="card mt-6 border border-info bg-base-100">
			<div class="card-body p-4">
				<div class="mb-3 flex items-start gap-2">
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/10">
						<IconTag class="size-4 text-info" />
					</div>
					<div class="min-w-0 flex-1">
						<h3 class="text-sm leading-tight font-bold">Universal Offers</h3>
						<p class="mt-1 text-xs text-base-content/60">
							{data.allLocationsOfferCount}
							{data.allLocationsOfferCount === 1 ? 'offer' : 'offers'} available at all locations
						</p>
					</div>
				</div>
				<a href="/offers" class="btn w-full gap-1.5 btn-ghost btn-sm"> View All → </a>
			</div>
		</div>
	{/if}
{/if}
