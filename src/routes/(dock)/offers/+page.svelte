<!-- src/routes/(dock)/offers/+page.svelte -->
<script lang="ts">
	import IconTag from '~icons/fluent/tag-20-regular';
	import IconAdd from '~icons/fluent/add-20-regular';
	import IconLocation from '~icons/fluent/location-20-regular';
	import IconGlobe from '~icons/fluent/globe-20-regular';
	import IconMoney from '~icons/fluent/money-20-regular';
	import IconEdit from '~icons/fluent/edit-20-regular';
	import IconDelete from '~icons/fluent/delete-20-regular';

	let { data } = $props();

	// Separate offers by location type
	const allLocationOffers = $derived(data.offers.filter((o) => o.locationId === null));
	const specificLocationOffers = $derived(data.offers.filter((o) => o.locationId !== null));
	const activeOffers = $derived(data.offers.filter((o) => o.isActive));
	const inactiveOffers = $derived(data.offers.filter((o) => !o.isActive));
</script>

<div class="container mx-auto px-4 py-8 max-w-7xl">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
		<div class="flex items-center gap-3">
			<div class="avatar placeholder">
				<div class="bg-primary text-primary-content rounded-full w-12">
					<IconTag class="w-7 h-7" />
				</div>
			</div>
			<div>
				<h1 class="text-3xl font-bold">Business Offers</h1>
				<p class="text-base-content/70 mt-1">Manage your special offers and promotions</p>
			</div>
		</div>
		<a href="/offers/new" class="btn btn-primary gap-2">
			<IconAdd class="w-5 h-5" />
			Create Offer
		</a>
	</div>

	<!-- Stats -->
	<div class="stats stats-vertical lg:stats-horizontal shadow w-full mb-8">
		<div class="stat">
			<div class="stat-figure text-primary">
				<IconTag class="w-8 h-8" />
			</div>
			<div class="stat-title">Total Offers</div>
			<div class="stat-value text-primary">{data.offers.length}</div>
			<div class="stat-desc">All offers created</div>
		</div>

		<div class="stat">
			<div class="stat-figure text-success">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					class="inline-block w-8 h-8 stroke-current"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					></path>
				</svg>
			</div>
			<div class="stat-title">Active</div>
			<div class="stat-value text-success">{activeOffers.length}</div>
			<div class="stat-desc">Currently available</div>
		</div>

		<div class="stat">
			<div class="stat-figure text-secondary">
				<IconGlobe class="w-8 h-8" />
			</div>
			<div class="stat-title">All Locations</div>
			<div class="stat-value text-secondary">{allLocationOffers.length}</div>
			<div class="stat-desc">Available everywhere</div>
		</div>

		<div class="stat">
			<div class="stat-figure text-info">
				<IconLocation class="w-8 h-8" />
			</div>
			<div class="stat-title">Location-Specific</div>
			<div class="stat-value text-info">{specificLocationOffers.length}</div>
			<div class="stat-desc">Targeted offers</div>
		</div>
	</div>

	{#if data.offers.length === 0}
		<!-- Empty State -->
		<div class="hero bg-base-200 rounded-box">
			<div class="hero-content text-center py-16">
				<div class="max-w-md">
					<div class="flex justify-center mb-4">
						<div class="avatar placeholder">
							<div class="bg-neutral text-neutral-content rounded-full w-24">
								<IconTag class="w-12 h-12" />
							</div>
						</div>
					</div>
					<h2 class="text-2xl font-bold mb-4">No offers yet</h2>
					<p class="mb-6 text-base-content/70">
						Create your first offer to attract customers and boost your business
					</p>
					<a href="/offers/new" class="btn btn-primary gap-2">
						<IconAdd class="w-5 h-5" />
						Create First Offer
					</a>
				</div>
			</div>
		</div>
	{:else}
		<!-- All Locations Offers -->
		{#if allLocationOffers.length > 0}
			<div class="mb-8">
				<div class="flex items-center gap-2 mb-4">
					<IconGlobe class="w-6 h-6 text-secondary" />
					<h2 class="text-2xl font-semibold">All Locations</h2>
					<div class="badge badge-secondary">{allLocationOffers.length}</div>
				</div>
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each allLocationOffers as offer}
						<div
							class="card bg-gradient-to-br from-secondary/10 to-accent/10 border-2 border-secondary/30 shadow-lg hover:shadow-xl transition-shadow"
						>
							<div class="card-body">
								<div class="flex items-start justify-between gap-2 mb-2">
									<h3 class="card-title text-lg">{offer.name}</h3>
									{#if offer.isActive}
										<div class="badge badge-success gap-1">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-3 w-3"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M5 13l4 4L19 7"
												/>
											</svg>
											Active
										</div>
									{:else}
										<div class="badge badge-ghost">Inactive</div>
									{/if}
								</div>

								<p class="text-sm text-base-content/70 line-clamp-2 mb-3">
									{offer.description}
								</p>

								<div class="flex items-center gap-2 mb-3">
									<div class="badge badge-success badge-lg gap-1 font-bold">
										<IconMoney class="w-4 h-4" />
										{offer.price.toFixed(2)}
										{offer.currency}
									</div>
								</div>

								<div class="badge badge-secondary badge-outline gap-1 mb-3">
									<IconGlobe class="w-4 h-4" />
									Available everywhere
								</div>

								<div class="text-xs text-base-content/50 mb-3">
									Created {new Date(offer.createdAt).toLocaleDateString('en-US', {
										year: 'numeric',
										month: 'short',
										day: 'numeric'
									})}
								</div>

								<div class="card-actions justify-end">
									<button class="btn btn-sm btn-ghost gap-1">
										<IconEdit class="w-4 h-4" />
										Edit
									</button>
									<button class="btn btn-sm btn-error btn-outline gap-1">
										<IconDelete class="w-4 h-4" />
										Delete
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Location-Specific Offers -->
		{#if specificLocationOffers.length > 0}
			<div>
				<div class="flex items-center gap-2 mb-4">
					<IconLocation class="w-6 h-6 text-info" />
					<h2 class="text-2xl font-semibold">Location-Specific Offers</h2>
					<div class="badge badge-info">{specificLocationOffers.length}</div>
				</div>
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each specificLocationOffers as offer}
						<div
							class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow border border-base-300"
						>
							<div class="card-body">
								<div class="flex items-start justify-between gap-2 mb-2">
									<h3 class="card-title text-lg">{offer.name}</h3>
									{#if offer.isActive}
										<div class="badge badge-success gap-1">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-3 w-3"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M5 13l4 4L19 7"
												/>
											</svg>
											Active
										</div>
									{:else}
										<div class="badge badge-ghost">Inactive</div>
									{/if}
								</div>

								<p class="text-sm text-base-content/70 line-clamp-2 mb-3">
									{offer.description}
								</p>

								<div class="flex items-center gap-2 mb-3">
									<div class="badge badge-success badge-lg gap-1 font-bold">
										<IconMoney class="w-4 h-4" />
										{offer.price.toFixed(2)}
										{offer.currency}
									</div>
								</div>

								<div class="alert alert-info py-2 px-3">
									<IconLocation class="w-4 h-4" />
									<div class="text-xs">
										<div class="font-semibold">{offer.locationName}</div>
										<div class="text-base-content/60">
											{offer.locationCity}{#if offer.locationState}, {offer.locationState}{/if}
										</div>
									</div>
								</div>

								<div class="text-xs text-base-content/50 mb-3 mt-2">
									Created {new Date(offer.createdAt).toLocaleDateString('en-US', {
										year: 'numeric',
										month: 'short',
										day: 'numeric'
									})}
								</div>

								<div class="card-actions justify-end">
									<button class="btn btn-sm btn-ghost gap-1">
										<IconEdit class="w-4 h-4" />
										Edit
									</button>
									<button class="btn btn-sm btn-error btn-outline gap-1">
										<IconDelete class="w-4 h-4" />
										Delete
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Quick Actions -->
		<div class="mt-8 flex flex-wrap gap-4">
			<a href="/locations" class="btn btn-outline gap-2">
				<IconLocation class="w-5 h-5" />
				Manage Locations
			</a>
			<a href="/offers/new" class="btn btn-primary gap-2">
				<IconAdd class="w-5 h-5" />
				Create Another Offer
			</a>
		</div>
	{/if}
</div>
