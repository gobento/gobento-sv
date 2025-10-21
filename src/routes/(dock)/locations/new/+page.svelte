<!-- src/routes/(dock)/locations/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import IconLocation from '~icons/fluent/location-20-regular';
	import IconArrowLeft from '~icons/fluent/arrow-left-20-regular';
	import IconSave from '~icons/fluent/save-20-regular';
	import IconMap from '~icons/fluent/map-20-regular';
	import IconSearch from '~icons/fluent/search-20-regular';

	let form = $page.form;
	let isSubmitting = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let isSearching = $state(false);

	async function searchLocation() {
		if (!searchQuery.trim()) return;

		isSearching = true;
		try {
			// Using Nominatim OpenStreetMap API for geocoding
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
			);
			const results = await response.json();
			searchResults = results;
		} catch (error) {
			console.error('Search failed:', error);
		} finally {
			isSearching = false;
		}
	}

	function selectLocation(result: any) {
		// Populate form fields
		const addressInput = document.querySelector<HTMLInputElement>('input[name="address"]');
		const cityInput = document.querySelector<HTMLInputElement>('input[name="city"]');
		const stateInput = document.querySelector<HTMLInputElement>('input[name="state"]');
		const countryInput = document.querySelector<HTMLInputElement>('input[name="country"]');
		const latInput = document.querySelector<HTMLInputElement>('input[name="latitude"]');
		const lonInput = document.querySelector<HTMLInputElement>('input[name="longitude"]');
		const zipInput = document.querySelector<HTMLInputElement>('input[name="zipCode"]');

		if (addressInput) addressInput.value = result.display_name.split(',')[0] || '';
		if (cityInput)
			cityInput.value =
				result.address?.city || result.address?.town || result.address?.village || '';
		if (stateInput) stateInput.value = result.address?.state || '';
		if (countryInput) countryInput.value = result.address?.country || '';
		if (latInput) latInput.value = result.lat;
		if (lonInput) lonInput.value = result.lon;
		if (zipInput) zipInput.value = result.address?.postcode || '';

		searchResults = [];
		searchQuery = '';
	}
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center gap-3">
			<div class="avatar placeholder">
				<div class="bg-primary text-primary-content rounded-full w-12">
					<IconLocation class="w-7 h-7" />
				</div>
			</div>
			<div>
				<h1 class="text-3xl font-bold">Add New Location</h1>
				<p class="text-base-content/70 mt-1">Create a new business location</p>
			</div>
		</div>
	</div>

	<!-- Address Search Card -->
	<div class="card bg-primary/10 border border-primary/20 mb-6">
		<div class="card-body">
			<div class="flex items-center gap-2 mb-3">
				<IconSearch class="w-5 h-5 text-primary" />
				<h2 class="card-title text-lg">Search Address</h2>
			</div>
			<p class="text-sm mb-4">Search for an address to automatically fill in location details</p>

			<div class="join w-full">
				<input
					type="text"
					bind:value={searchQuery}
					onkeydown={(e) => e.key === 'Enter' && searchLocation()}
					placeholder="Enter address, city, or place name..."
					class="input input-bordered join-item flex-1"
				/>
				<button onclick={searchLocation} disabled={isSearching} class="btn btn-primary join-item">
					{#if isSearching}
						<span class="loading loading-spinner loading-sm"></span>
					{:else}
						<IconSearch class="w-5 h-5" />
					{/if}
					Search
				</button>
			</div>

			{#if searchResults.length > 0}
				<div class="divider my-2"></div>
				<div class="space-y-2 max-h-64 overflow-y-auto">
					{#each searchResults as result}
						<button
							onclick={() => selectLocation(result)}
							class="btn btn-ghost w-full justify-start h-auto py-3 normal-case"
						>
							<IconMap class="w-5 h-5 text-base-content/60 flex-shrink-0" />
							<div class="text-left flex-1">
								<div class="font-medium">{result.display_name}</div>
								<div class="text-xs text-base-content/60">Lat: {result.lat}, Lon: {result.lon}</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Form Card -->
	<form
		method="POST"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
		class="card bg-base-100 shadow-xl"
	>
		<div class="card-body">
			{#if form?.message}
				<div class="alert alert-error">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="stroke-current shrink-0 h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>{form.message}</span>
				</div>
			{/if}

			<div class="space-y-4">
				<!-- Location Name -->
				<div class="form-control">
					<label class="label" for="name">
						<span class="label-text font-medium"
							>Location Name <span class="text-error">*</span></span
						>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						required
						placeholder="e.g., Downtown Branch, Main Office"
						class="input input-bordered"
						class:input-error={form?.field === 'name'}
					/>
					<label class="label">
						<span class="label-text-alt">A friendly name to identify this location</span>
					</label>
				</div>

				<div class="divider">Address Details</div>

				<!-- Street Address -->
				<div class="form-control">
					<label class="label" for="address">
						<span class="label-text font-medium"
							>Street Address <span class="text-error">*</span></span
						>
					</label>
					<input
						type="text"
						id="address"
						name="address"
						required
						placeholder="123 Main Street"
						class="input input-bordered"
						class:input-error={form?.field === 'address'}
					/>
				</div>

				<!-- City and State -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="form-control">
						<label class="label" for="city">
							<span class="label-text font-medium">City <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							id="city"
							name="city"
							required
							placeholder="City name"
							class="input input-bordered"
							class:input-error={form?.field === 'city'}
						/>
					</div>

					<div class="form-control">
						<label class="label" for="state">
							<span class="label-text font-medium">State / Province</span>
						</label>
						<input
							type="text"
							id="state"
							name="state"
							placeholder="Optional"
							class="input input-bordered"
						/>
					</div>
				</div>

				<!-- ZIP and Country -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="form-control">
						<label class="label" for="zipCode">
							<span class="label-text font-medium">ZIP / Postal Code</span>
						</label>
						<input
							type="text"
							id="zipCode"
							name="zipCode"
							placeholder="Optional"
							class="input input-bordered"
						/>
					</div>

					<div class="form-control">
						<label class="label" for="country">
							<span class="label-text font-medium">Country <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							id="country"
							name="country"
							required
							placeholder="Country name"
							class="input input-bordered"
							class:input-error={form?.field === 'country'}
						/>
					</div>
				</div>

				<div class="divider">Coordinates</div>

				<!-- Coordinates -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="form-control">
						<label class="label" for="latitude">
							<span class="label-text font-medium">Latitude <span class="text-error">*</span></span>
						</label>
						<input
							type="number"
							id="latitude"
							name="latitude"
							required
							step="any"
							min="-90"
							max="90"
							placeholder="e.g., 40.7128"
							class="input input-bordered"
							class:input-error={form?.field === 'latitude'}
						/>
						<label class="label">
							<span class="label-text-alt">Range: -90 to 90</span>
						</label>
					</div>

					<div class="form-control">
						<label class="label" for="longitude">
							<span class="label-text font-medium">Longitude <span class="text-error">*</span></span
							>
						</label>
						<input
							type="number"
							id="longitude"
							name="longitude"
							required
							step="any"
							min="-180"
							max="180"
							placeholder="e.g., -74.0060"
							class="input input-bordered"
							class:input-error={form?.field === 'longitude'}
						/>
						<label class="label">
							<span class="label-text-alt">Range: -180 to 180</span>
						</label>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="card-actions justify-end mt-6 gap-2">
				<a href="/locations" class="btn btn-ghost"> Cancel </a>
				<button type="submit" disabled={isSubmitting} class="btn btn-primary gap-2">
					{#if isSubmitting}
						<span class="loading loading-spinner loading-sm"></span>
						Creating...
					{:else}
						<IconSave class="w-5 h-5" />
						Create Location
					{/if}
				</button>
			</div>
		</div>
	</form>
</div>
