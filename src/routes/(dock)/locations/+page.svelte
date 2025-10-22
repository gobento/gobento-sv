<!-- src/routes/(dock)/locations/+page.svelte -->
<script lang="ts">
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconMap from '~icons/fluent/map-24-regular';
	let { data } = $props();
</script>

<!-- Header -->
<div class="flex items-center justify-between mb-12">
	<div class="flex items-center gap-5">
		<div class="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
			<IconMap class="w-7 h-7 text-primary-content" />
		</div>
		<div>
			<h1 class="text-4xl font-bold tracking-tight">Business Locations</h1>
			<p class="text-base text-base-content/60 mt-2">Manage your physical business locations</p>
		</div>
	</div>
	{#if data.locations.length > 0}
		<a href="/locations/new" class="btn btn-primary gap-2.5">
			<IconAdd class="w-5 h-5" />
			Add Location
		</a>
	{/if}
</div>

{#if data.locations.length === 0}
	<!-- Empty State -->
	<div class="card bg-base-100 border border-base-300">
		<div class="card-body items-center text-center py-24">
			<div class="w-24 h-24 rounded-3xl bg-base-200 flex items-center justify-center mb-8">
				<IconLocation class="w-12 h-12 text-base-content/40" />
			</div>
			<h2 class="text-3xl font-bold mb-3">No locations yet</h2>
			<p class="text-base-content/60 max-w-lg mb-10 text-lg">
				Start by adding your first business location to begin creating and managing offers for your
				customers
			</p>
			<a href="/locations/new" class="btn btn-primary btn-lg gap-3">
				<IconAdd class="w-6 h-6" />
				Add Your First Location
			</a>
		</div>
	</div>
{:else}
	<!-- Locations Grid -->
	<div class="grid gap-5">
		{#each data.locations as location}
			<div
				class="card bg-base-100 border-2 border-base-300 hover:border-primary transition-colors duration-200"
			>
				<div class="card-body p-8">
					<div class="flex items-start justify-between gap-8">
						<div class="flex items-start gap-5 flex-1 min-w-0">
							<div
								class="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0"
							>
								<IconLocation class="w-6 h-6 text-primary-content" />
							</div>
							<div class="flex-1 min-w-0">
								<h3 class="text-2xl font-bold mb-3">{location.name}</h3>
								<div class="text-base text-base-content/70 space-y-1.5 mb-6">
									<p class="font-medium">{location.address}</p>
									<p>
										{location.city}{#if location.state}, {location.state}{/if}
										{#if location.zipCode}
											{location.zipCode}{/if}
									</p>
									<p>{location.country}</p>
								</div>
								<div class="flex items-center gap-6 text-sm">
									<div class="flex items-center gap-2 px-3 py-2 bg-base-200 rounded-lg">
										<IconTag class="w-4 h-4 text-base-content/70" />
										<span class="font-semibold">
											{location.offerCount}
											{location.offerCount === 1 ? 'offer' : 'offers'}
										</span>
									</div>
									<span class="text-base-content/50 font-medium">
										Added {new Date(location.createdAt).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}
									</span>
								</div>
							</div>
						</div>
						<a href="/offers/new?locationId={location.id}" class="btn btn-success gap-2.5 shrink-0">
							<IconAdd class="w-5 h-5" />
							Create Offer
						</a>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- All Locations Summary -->
	{#if data.allLocationsOfferCount > 0}
		<div class="card bg-info/10 border-2 border-info/30 mt-10">
			<div class="card-body p-8">
				<div class="flex items-center justify-between gap-6">
					<div class="flex items-center gap-5">
						<div class="w-12 h-12 rounded-xl bg-info flex items-center justify-center shrink-0">
							<IconTag class="w-6 h-6 text-info-content" />
						</div>
						<div>
							<h3 class="font-bold text-xl">Universal Offers</h3>
							<p class="text-base text-base-content/70 mt-1">
								{data.allLocationsOfferCount}
								{data.allLocationsOfferCount === 1 ? 'offer' : 'offers'} available at all locations
							</p>
						</div>
					</div>
					<a href="/offers" class="btn btn-ghost gap-3">
						View All
						<span class="text-xl">→</span>
					</a>
				</div>
			</div>
		</div>
	{/if}
{/if}
