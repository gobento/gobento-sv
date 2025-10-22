<!-- src/routes/(dock)/locations/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconSave from '~icons/fluent/save-20-regular';
	import IconMap from '~icons/fluent/map-24-regular';
	import IconSearch from '~icons/fluent/search-20-regular';

	let { data } = $props();
	let form = $page.form;
	let isSubmitting = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let isSearching = $state(false);
	let selectedLocation = $state<any>(null);

	async function searchLocation() {
		if (!searchQuery.trim()) return;

		isSearching = true;
		try {
			// Search only within business country using countrycodes parameter
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?` +
					`format=json&` +
					`q=${encodeURIComponent(searchQuery)}&` +
					`countrycodes=${data.businessCountry.toLowerCase()}&` +
					`limit=5&` +
					`addressdetails=1`
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
		selectedLocation = result;

		// Populate form fields
		const nameInput = document.querySelector<HTMLInputElement>('input[name="name"]');
		const addressInput = document.querySelector<HTMLInputElement>('input[name="address"]');
		const cityInput = document.querySelector<HTMLInputElement>('input[name="city"]');
		const stateInput = document.querySelector<HTMLInputElement>('input[name="state"]');
		const countryInput = document.querySelector<HTMLInputElement>('input[name="country"]');
		const latInput = document.querySelector<HTMLInputElement>('input[name="latitude"]');
		const lonInput = document.querySelector<HTMLInputElement>('input[name="longitude"]');
		const zipInput = document.querySelector<HTMLInputElement>('input[name="zipCode"]');

		// Extract street address (first part of display_name)
		const addressParts = result.display_name.split(',');
		const streetAddress = addressParts[0] || '';

		if (nameInput && !nameInput.value) {
			nameInput.value = streetAddress;
		}
		if (addressInput) addressInput.value = streetAddress;
		if (cityInput)
			cityInput.value =
				result.address?.city || result.address?.town || result.address?.village || '';
		if (stateInput) stateInput.value = result.address?.state || '';
		if (countryInput) countryInput.value = result.address?.country || data.businessCountry;
		if (latInput) latInput.value = result.lat;
		if (lonInput) lonInput.value = result.lon;
		if (zipInput) zipInput.value = result.address?.postcode || '';

		searchResults = [];
		searchQuery = '';
	}

	// Auto-fill city based on ZIP code
	async function lookupZipCode() {
		const zipInput = document.querySelector<HTMLInputElement>('input[name="zipCode"]');
		const zipCode = zipInput?.value;

		if (!zipCode || zipCode.trim().length < 3) return;

		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?` +
					`format=json&` +
					`postalcode=${encodeURIComponent(zipCode)}&` +
					`countrycodes=${data.businessCountry.toLowerCase()}&` +
					`limit=1&` +
					`addressdetails=1`
			);
			const results = await response.json();

			if (results.length > 0) {
				const result = results[0];
				const cityInput = document.querySelector<HTMLInputElement>('input[name="city"]');
				const stateInput = document.querySelector<HTMLInputElement>('input[name="state"]');
				const latInput = document.querySelector<HTMLInputElement>('input[name="latitude"]');
				const lonInput = document.querySelector<HTMLInputElement>('input[name="longitude"]');

				if (cityInput && !cityInput.value) {
					cityInput.value =
						result.address?.city || result.address?.town || result.address?.village || '';
				}
				if (stateInput && !stateInput.value) {
					stateInput.value = result.address?.state || '';
				}
				if (latInput && !latInput.value) {
					latInput.value = result.lat;
				}
				if (lonInput && !lonInput.value) {
					lonInput.value = result.lon;
				}
			}
		} catch (error) {
			console.error('ZIP code lookup failed:', error);
		}
	}
</script>

<!-- Header -->
<div class="flex items-center justify-between mb-12">
	<div class="flex items-center gap-5">
		<div class="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
			<IconLocation class="w-7 h-7 text-primary-content" />
		</div>
		<div>
			<h1 class="text-4xl font-bold tracking-tight">Add New Location</h1>
			<p class="text-base text-base-content/60 mt-2">
				Create a new business location in {data.businessCountry}
			</p>
		</div>
	</div>
</div>

<!-- Address Search Card -->
<div class="card bg-primary/10 border-2 border-primary/30 mb-6">
	<div class="card-body p-8">
		<div class="flex items-center gap-3 mb-4">
			<IconSearch class="w-6 h-6 text-primary" />
			<h2 class="text-2xl font-bold">Search Address</h2>
		</div>
		<p class="text-base text-base-content/70 mb-6">
			Search for an address in {data.businessCountry} to automatically fill in all details
		</p>

		<div class="join w-full">
			<input
				type="text"
				bind:value={searchQuery}
				onkeydown={(e) => e.key === 'Enter' && searchLocation()}
				placeholder="Enter address, city, or place name..."
				class="input input-bordered input-lg join-item flex-1"
			/>
			<button
				onclick={searchLocation}
				disabled={isSearching}
				class="btn btn-primary btn-lg join-item gap-2.5"
			>
				{#if isSearching}
					<span class="loading loading-spinner loading-md"></span>
				{:else}
					<IconSearch class="w-5 h-5" />
				{/if}
				Search
			</button>
		</div>

		{#if searchResults.length > 0}
			<div class="divider my-4"></div>
			<div class="space-y-3 max-h-80 overflow-y-auto">
				{#each searchResults as result}
					<button
						onclick={() => selectLocation(result)}
						class="w-full text-left p-4 rounded-xl bg-base-100 hover:bg-base-200 border-2 border-base-300 hover:border-primary transition-all duration-200"
					>
						<div class="flex items-start gap-4">
							<IconMap class="w-6 h-6 text-primary flex-shrink-0 mt-1" />
							<div class="flex-1 min-w-0">
								<div class="font-semibold text-lg mb-1">{result.display_name}</div>
								{#if result.address?.postcode}
									<div class="text-sm text-base-content/60">ZIP: {result.address.postcode}</div>
								{/if}
							</div>
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
	class="card bg-base-100 border-2 border-base-300"
>
	<div class="card-body p-8">
		{#if form?.message}
			<div class="alert alert-error mb-6">
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
				<span class="text-base">{form.message}</span>
			</div>
		{/if}

		<div class="space-y-6">
			<!-- Location Name -->
			<div class="form-control">
				<label class="label" for="name">
					<span class="label-text font-semibold text-base"
						>Location Name <span class="text-error">*</span></span
					>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					required
					placeholder="e.g., Downtown Branch, Main Office"
					class="input input-bordered input-lg"
					class:input-error={form?.field === 'name'}
				/>
				<label class="label">
					<span class="label-text-alt text-base-content/60"
						>A friendly name to identify this location</span
					>
				</label>
			</div>

			<div class="divider text-lg font-semibold">Address Details</div>

			<!-- ZIP Code (now first and required) -->
			<div class="form-control">
				<label class="label" for="zipCode">
					<span class="label-text font-semibold text-base"
						>ZIP / Postal Code <span class="text-error">*</span></span
					>
				</label>
				<input
					type="text"
					id="zipCode"
					name="zipCode"
					required
					placeholder="Enter ZIP code"
					class="input input-bordered input-lg"
					class:input-error={form?.field === 'zipCode'}
					onblur={lookupZipCode}
				/>
				<label class="label">
					<span class="label-text-alt text-base-content/60"
						>City will be automatically filled based on ZIP code</span
					>
				</label>
			</div>

			<!-- Street Address -->
			<div class="form-control">
				<label class="label" for="address">
					<span class="label-text font-semibold text-base"
						>Street Address <span class="text-error">*</span></span
					>
				</label>
				<input
					type="text"
					id="address"
					name="address"
					required
					placeholder="123 Main Street"
					class="input input-bordered input-lg"
					class:input-error={form?.field === 'address'}
				/>
			</div>

			<!-- City and State -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="form-control">
					<label class="label" for="city">
						<span class="label-text font-semibold text-base"
							>City <span class="text-error">*</span></span
						>
					</label>
					<input
						type="text"
						id="city"
						name="city"
						required
						placeholder="City name"
						class="input input-bordered input-lg"
						class:input-error={form?.field === 'city'}
					/>
				</div>

				<div class="form-control">
					<label class="label" for="state">
						<span class="label-text font-semibold text-base">State / Province</span>
					</label>
					<input
						type="text"
						id="state"
						name="state"
						placeholder="Optional"
						class="input input-bordered input-lg"
					/>
				</div>
			</div>

			<!-- Hidden fields for coordinates and country -->
			<input type="hidden" name="latitude" required />
			<input type="hidden" name="longitude" required />
			<input type="hidden" name="country" value={data.businessCountry} />

			{#if selectedLocation}
				<div class="alert alert-success">
					<IconMap class="w-6 h-6" />
					<span class="text-base font-medium">Location coordinates set from search</span>
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex justify-end gap-3 mt-10">
			<a href="/locations" class="btn btn-ghost btn-lg">Cancel</a>
			<button type="submit" disabled={isSubmitting} class="btn btn-primary btn-lg gap-2.5">
				{#if isSubmitting}
					<span class="loading loading-spinner loading-md"></span>
					Creating...
				{:else}
					<IconSave class="w-5 h-5" />
					Create Location
				{/if}
			</button>
		</div>
	</div>
</form>
