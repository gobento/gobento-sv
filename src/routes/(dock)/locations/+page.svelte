<!-- src/routes/(dock)/locations/+page.svelte -->
<script lang="ts">
	import IconAdd from '~icons/fluent/add-20-regular';
	import IconLocation from '~icons/fluent/location-20-regular';
	import IconTag from '~icons/fluent/tag-20-regular';
	import IconMap from '~icons/fluent/map-20-regular';

	let { data } = $props();
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	<div class="flex items-center justify-between mb-8">
		<div class="flex items-center gap-3">
			<IconMap class="w-7 h-7 text-primary" />
			<h1 class="text-2xl font-bold">Business Locations</h1>
		</div>
		<a href="/locations/new" class="btn btn-primary btn-sm gap-2">
			<IconAdd class="w-5 h-5" />
			Add Location
		</a>
	</div>

	{#if data.locations.length === 0}
		<div class="card bg-base-200 border-2 border-dashed border-base-300">
			<div class="card-body items-center text-center py-16">
				<IconLocation class="w-12 h-12 opacity-30 mb-3" />
				<h2 class="text-lg font-semibold mb-1">No locations yet</h2>
				<p class="text-sm opacity-60 mb-4">
					Add your first business location to start creating offers
				</p>
				<a href="/locations/new" class="btn btn-primary btn-sm gap-2">
					<IconAdd class="w-4 h-4" />
					Add First Location
				</a>
			</div>
		</div>
	{:else}
		<div class="card bg-base-100 shadow">
			<div class="divide-y divide-base-300">
				{#each data.locations as location}
					<div class="p-4 hover:bg-base-200 transition-colors">
						<div class="flex items-start justify-between gap-4">
							<div class="flex items-start gap-3 flex-1 min-w-0">
								<IconLocation class="w-5 h-5 text-primary shrink-0 mt-0.5" />
								<div class="flex-1 min-w-0">
									<h3 class="font-semibold text-base mb-1">{location.name}</h3>
									<div class="text-sm opacity-60 space-y-0.5">
										<p>{location.address}</p>
										<p>
											{location.city}{#if location.state}, {location.state}{/if}
											{#if location.zipCode}{location.zipCode}{/if}
										</p>
										<p>{location.country}</p>
									</div>
									<div class="flex items-center gap-4 mt-3 text-xs opacity-50">
										<div class="flex items-center gap-1.5">
											<IconTag class="w-3.5 h-3.5" />
											<span
												>{location.offerCount}
												{location.offerCount === 1 ? 'offer' : 'offers'}</span
											>
										</div>
										<span>Added {new Date(location.createdAt).toLocaleDateString()}</span>
									</div>
								</div>
							</div>
							<a
								href="/offers/new?locationId={location.id}"
								class="btn btn-success btn-xs gap-1 shrink-0"
							>
								<IconAdd class="w-3.5 h-3.5" />
								Offer
							</a>
						</div>
					</div>
				{/each}
			</div>
		</div>

		{#if data.allLocationsOfferCount > 0}
			<div class="alert mt-6">
				<IconTag class="w-5 h-5" />
				<div class="flex-1">
					<h3 class="font-semibold">All Locations Offers</h3>
					<p class="text-sm opacity-70">
						{data.allLocationsOfferCount}
						{data.allLocationsOfferCount === 1 ? 'offer' : 'offers'} available at all locations
					</p>
				</div>
				<a href="/offers" class="btn btn-ghost btn-sm">View all →</a>
			</div>
		{/if}
	{/if}
</div>
