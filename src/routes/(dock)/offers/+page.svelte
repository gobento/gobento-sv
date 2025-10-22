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

<!-- Header -->
<div class="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
	<div class="flex items-center gap-3">
		<div class="placeholder avatar">
			<div class="w-12 rounded-full bg-primary text-primary-content">
				<IconTag class="h-7 w-7" />
			</div>
		</div>
		<div>
			<h1 class="text-3xl font-bold">Business Offers</h1>
			<p class="mt-1 text-base-content/70">Manage your special offers and promotions</p>
		</div>
	</div>
	<a href="/offers/new" class="btn gap-2 btn-primary">
		<IconAdd class="h-5 w-5" />
		Create Offer
	</a>
</div>

<!-- Stats -->
<div class="stats mb-8 w-full stats-vertical shadow lg:stats-horizontal">
	<div class="stat">
		<div class="stat-figure text-primary">
			<IconTag class="h-8 w-8" />
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
				class="inline-block h-8 w-8 stroke-current"
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
			<IconGlobe class="h-8 w-8" />
		</div>
		<div class="stat-title">All Locations</div>
		<div class="stat-value text-secondary">{allLocationOffers.length}</div>
		<div class="stat-desc">Available everywhere</div>
	</div>

	<div class="stat">
		<div class="stat-figure text-info">
			<IconLocation class="h-8 w-8" />
		</div>
		<div class="stat-title">Location-Specific</div>
		<div class="stat-value text-info">{specificLocationOffers.length}</div>
		<div class="stat-desc">Targeted offers</div>
	</div>
</div>

{#if data.offers.length === 0}
	<!-- Empty State -->
	<div class="hero rounded-box bg-base-200">
		<div class="hero-content py-16 text-center">
			<div class="max-w-md">
				<div class="mb-4 flex justify-center">
					<div class="placeholder avatar">
						<div class="w-24 rounded-full bg-neutral text-neutral-content">
							<IconTag class="h-12 w-12" />
						</div>
					</div>
				</div>
				<h2 class="mb-4 text-2xl font-bold">No offers yet</h2>
				<p class="mb-6 text-base-content/70">
					Create your first offer to attract customers and boost your business
				</p>
				<a href="/offers/new" class="btn gap-2 btn-primary">
					<IconAdd class="h-5 w-5" />
					Create First Offer
				</a>
			</div>
		</div>
	</div>
{:else}
	<!-- All Locations Offers -->
	{#if allLocationOffers.length > 0}
		<div class="mb-8">
			<div class="mb-4 flex items-center gap-2">
				<IconGlobe class="h-6 w-6 text-secondary" />
				<h2 class="text-2xl font-semibold">All Locations</h2>
				<div class="badge badge-secondary">{allLocationOffers.length}</div>
			</div>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each allLocationOffers as offer}
					<div
						class="card border-2 border-secondary/30 bg-gradient-to-br from-secondary/10 to-accent/10 shadow-lg transition-shadow hover:shadow-xl"
					>
						<div class="card-body">
							<div class="mb-2 flex items-start justify-between gap-2">
								<h3 class="card-title text-lg">{offer.name}</h3>
								{#if offer.isActive}
									<div class="badge gap-1 badge-success">
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

							<p class="mb-3 line-clamp-2 text-sm text-base-content/70">
								{offer.description}
							</p>

							<div class="mb-3 flex items-center gap-2">
								<div class="badge gap-1 badge-lg font-bold badge-success">
									<IconMoney class="h-4 w-4" />
									{offer.price.toFixed(2)}
									{offer.currency}
								</div>
							</div>

							<div class="mb-3 badge gap-1 badge-outline badge-secondary">
								<IconGlobe class="h-4 w-4" />
								Available everywhere
							</div>

							<div class="mb-3 text-xs text-base-content/50">
								Created {new Date(offer.createdAt).toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'short',
									day: 'numeric'
								})}
							</div>

							<div class="card-actions justify-end">
								<button class="btn gap-1 btn-ghost btn-sm">
									<IconEdit class="h-4 w-4" />
									Edit
								</button>
								<button class="btn gap-1 btn-outline btn-sm btn-error">
									<IconDelete class="h-4 w-4" />
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
			<div class="mb-4 flex items-center gap-2">
				<IconLocation class="h-6 w-6 text-info" />
				<h2 class="text-2xl font-semibold">Location-Specific Offers</h2>
				<div class="badge badge-info">{specificLocationOffers.length}</div>
			</div>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each specificLocationOffers as offer}
					<div
						class="card border border-base-300 bg-base-100 shadow-lg transition-shadow hover:shadow-xl"
					>
						<div class="card-body">
							<div class="mb-2 flex items-start justify-between gap-2">
								<h3 class="card-title text-lg">{offer.name}</h3>
								{#if offer.isActive}
									<div class="badge gap-1 badge-success">
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

							<p class="mb-3 line-clamp-2 text-sm text-base-content/70">
								{offer.description}
							</p>

							<div class="mb-3 flex items-center gap-2">
								<div class="badge gap-1 badge-lg font-bold badge-success">
									<IconMoney class="h-4 w-4" />
									{offer.price.toFixed(2)}
									{offer.currency}
								</div>
							</div>

							<div class="alert px-3 py-2 alert-info">
								<IconLocation class="h-4 w-4" />
								<div class="text-xs">
									<div class="font-semibold">{offer.locationName}</div>
									<div class="text-base-content/60">
										{offer.locationCity}{#if offer.locationState}, {offer.locationState}{/if}
									</div>
								</div>
							</div>

							<div class="mt-2 mb-3 text-xs text-base-content/50">
								Created {new Date(offer.createdAt).toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'short',
									day: 'numeric'
								})}
							</div>

							<div class="card-actions justify-end">
								<button class="btn gap-1 btn-ghost btn-sm">
									<IconEdit class="h-4 w-4" />
									Edit
								</button>
								<button class="btn gap-1 btn-outline btn-sm btn-error">
									<IconDelete class="h-4 w-4" />
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
		<a href="/locations" class="btn gap-2 btn-outline">
			<IconLocation class="h-5 w-5" />
			Manage Locations
		</a>
		<a href="/offers/new" class="btn gap-2 btn-primary">
			<IconAdd class="h-5 w-5" />
			Create Another Offer
		</a>
	</div>
{/if}
