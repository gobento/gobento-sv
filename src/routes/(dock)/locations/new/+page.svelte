<!-- src/routes/(dock)/locations/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconSave from '~icons/fluent/save-24-regular';
	import IconMap from '~icons/fluent/map-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconImage from '~icons/fluent/image-24-regular';
	import IconCamera from '~icons/fluent/camera-24-regular';

	let { data } = $props();
	let form = $page.form;
	let isSubmitting = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let isSearching = $state(false);
	let selectedLocation = $state<any>(null);

	// Image upload state
	let selectedImage = $state<File | null>(null);
	let imagePreviewUrl = $state<string | null>(null);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;

	const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

	async function searchLocation() {
		if (!searchQuery.trim()) return;

		isSearching = true;
		try {
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

		const nameInput = document.querySelector<HTMLInputElement>('input[name="name"]');
		const addressInput = document.querySelector<HTMLInputElement>('input[name="address"]');
		const cityInput = document.querySelector<HTMLInputElement>('input[name="city"]');
		const provinceInput = document.querySelector<HTMLInputElement>('input[name="province"]');
		const countryInput = document.querySelector<HTMLInputElement>('input[name="country"]');
		const latInput = document.querySelector<HTMLInputElement>('input[name="latitude"]');
		const lonInput = document.querySelector<HTMLInputElement>('input[name="longitude"]');
		const zipInput = document.querySelector<HTMLInputElement>('input[name="zipCode"]');

		const addressParts = result.display_name.split(',');
		const streetAddress = addressParts[0] || '';

		if (nameInput && !nameInput.value) {
			nameInput.value = streetAddress;
		}
		if (addressInput) addressInput.value = streetAddress;
		if (cityInput)
			cityInput.value =
				result.address?.city || result.address?.town || result.address?.village || '';
		if (provinceInput) provinceInput.value = result.address?.province || '';
		if (countryInput) countryInput.value = result.address?.country || data.businessCountry;
		if (latInput) latInput.value = result.lat;
		if (lonInput) lonInput.value = result.lon;
		if (zipInput) zipInput.value = result.address?.postcode || '';

		searchResults = [];
		searchQuery = '';
	}

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
				const provinceInput = document.querySelector<HTMLInputElement>('input[name="province"]');
				const latInput = document.querySelector<HTMLInputElement>('input[name="latitude"]');
				const lonInput = document.querySelector<HTMLInputElement>('input[name="longitude"]');

				if (cityInput && !cityInput.value) {
					cityInput.value =
						result.address?.city || result.address?.town || result.address?.village || '';
				}
				if (provinceInput && !provinceInput.value) {
					provinceInput.value = result.address?.state || result.address?.province || '';
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

	// Image handling functions
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		processImage(file);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		const file = event.dataTransfer?.files[0];
		processImage(file);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragActive = true;
	}

	function handleDragLeave() {
		dragActive = false;
	}

	function processImage(file: File | undefined) {
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			alert('Please select an image file');
			return;
		}

		if (file.size > MAX_IMAGE_SIZE) {
			alert('Image size must be less than 5MB');
			return;
		}

		if (file.size === 0) {
			alert('Image file is empty');
			return;
		}

		selectedImage = file;

		if (imagePreviewUrl) {
			URL.revokeObjectURL(imagePreviewUrl);
		}

		imagePreviewUrl = URL.createObjectURL(file);
	}

	function clearImage() {
		if (isSubmitting) return;

		selectedImage = null;

		if (imagePreviewUrl) {
			URL.revokeObjectURL(imagePreviewUrl);
			imagePreviewUrl = null;
		}

		if (fileInput) {
			fileInput.value = '';
		}
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (imagePreviewUrl) {
				URL.revokeObjectURL(imagePreviewUrl);
			}
		};
	});
</script>

<BaseLayout
	title="Add New Location"
	description="Create a new business location in {data.businessCountry}"
	icon={IconLocation}
>
	<!-- Address Search Card -->
	<div class="card mb-6 border-2 border-primary/30 bg-primary/10">
		<div class="card-body p-8">
			<div class="mb-4 flex items-center gap-3">
				<IconSearch class="h-6 w-6 text-primary" />
				<h2 class="text-2xl font-bold">Search Address</h2>
			</div>
			<p class="mb-6 text-base text-base-content/70">
				Search for an address in {data.businessCountry} to automatically fill in all details
			</p>

			<div class="join w-full">
				<input
					type="text"
					bind:value={searchQuery}
					onkeydown={(e) => e.key === 'Enter' && searchLocation()}
					placeholder="Enter address, city, or place name..."
					class="input-bordered input input-lg join-item flex-1"
				/>
				<button
					onclick={searchLocation}
					disabled={isSearching}
					class="btn join-item gap-2.5 btn-primary"
				>
					{#if isSearching}
						<span class="loading loading-md loading-spinner"></span>
					{:else}
						<IconSearch class="h-5 w-5" />
					{/if}
					Search
				</button>
			</div>

			{#if searchResults.length > 0}
				<div class="divider my-4"></div>
				<div class="max-h-80 space-y-3 overflow-y-auto">
					{#each searchResults as result}
						<button
							onclick={() => selectLocation(result)}
							class="w-full rounded-xl border-2 border-base-300 bg-base-100 p-4 text-left transition-all duration-200 hover:border-primary hover:bg-base-200"
						>
							<div class="flex items-start gap-4">
								<IconMap class="mt-1 h-6 w-6 shrink-0 text-primary" />
								<div class="min-w-0 flex-1">
									<div class="mb-1 text-lg font-semibold">{result.display_name}</div>
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
		enctype="multipart/form-data"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
		class="card border-2 border-base-300 bg-base-100"
	>
		<div class="card-body p-8">
			{#if form?.message}
				<div class="mb-6 alert alert-error">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
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
				<!-- Location Image Upload -->
				<div class="form-control">
					<label class="label" for="locationImage">
						<span class="label-text text-base font-semibold">
							Location Front Image <span class="text-error">*</span>
						</span>
					</label>
					<p class="mb-3 text-sm text-base-content/60">
						Upload a photo of your location's storefront to help customers find you
					</p>

					<div
						class="relative"
						ondrop={handleDrop}
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
					>
						<input
							bind:this={fileInput}
							id="locationImage"
							name="locationImage"
							type="file"
							accept="image/*"
							class="hidden"
							onchange={handleFileSelect}
							disabled={isSubmitting}
							required
						/>

						<button
							type="button"
							onclick={() => fileInput?.click()}
							disabled={isSubmitting}
							class="group relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200 active:scale-[0.98]"
							class:border-primary={dragActive}
							class:bg-primary-5={dragActive}
							class:border-base-300={!dragActive && !selectedImage}
							class:border-success={selectedImage && !dragActive}
							class:bg-success-5={selectedImage && !dragActive}
							class:hover:border-primary={!isSubmitting}
							class:hover:bg-base-200={!isSubmitting && !selectedImage}
							class:opacity-50={isSubmitting}
							class:input-error={form?.field === 'locationImage'}
						>
							{#if !selectedImage}
								<div class="flex min-h-[200px] flex-col items-center justify-center gap-3 p-6">
									<div
										class="rounded-full bg-base-200 p-4 transition-transform group-hover:scale-110"
									>
										<IconCamera class="h-10 w-10 text-base-content/40" />
									</div>
									<div class="text-center">
										<p class="text-base font-semibold text-base-content">
											{#if dragActive}
												Drop image here
											{:else if isSubmitting}
												Uploading...
											{:else}
												Tap to upload location photo
											{/if}
										</p>
										{#if !isSubmitting}
											<p class="mt-1 text-sm text-base-content/60">Images only • 5MB max</p>
										{/if}
									</div>
								</div>
							{:else}
								<div class="relative">
									<img
										src={imagePreviewUrl}
										alt="Location preview"
										class="h-64 w-full object-cover"
									/>
									<div
										class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
									>
										<p class="text-lg font-semibold text-white">Tap to change</p>
									</div>
									<button
										type="button"
										onclick={(e) => {
											e.stopPropagation();
											clearImage();
										}}
										disabled={isSubmitting}
										class="btn absolute top-2 right-2 btn-circle btn-sm"
									>
										✕
									</button>
								</div>
								<div class="border-t border-base-300 p-3">
									<p class="truncate text-sm font-medium" title={selectedImage.name}>
										{selectedImage.name}
									</p>
									<p class="text-xs text-base-content/60">
										{Math.round(selectedImage.size / 1024)} KB
									</p>
								</div>
							{/if}
						</button>
					</div>
				</div>

				<div class="divider text-lg font-semibold">Location Details</div>

				<!-- Location Name -->
				<div class="form-control">
					<label class="label" for="name">
						<span class="label-text text-base font-semibold"
							>Location Name <span class="text-error">*</span></span
						>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						required
						placeholder="e.g., Downtown Branch, Main Office"
						class="input-bordered input input-lg"
						class:input-error={form?.field === 'name'}
					/>
					<label class="label">
						<span class="label-text-alt text-base-content/60"
							>A friendly name to identify this location</span
						>
					</label>
				</div>

				<div class="divider text-lg font-semibold">Address Details</div>

				<!-- ZIP Code -->
				<div class="form-control">
					<label class="label" for="zipCode">
						<span class="label-text text-base font-semibold"
							>ZIP / Postal Code <span class="text-error">*</span></span
						>
					</label>
					<input
						type="text"
						id="zipCode"
						name="zipCode"
						required
						placeholder="Enter ZIP code"
						class="input-bordered input input-lg"
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
						<span class="label-text text-base font-semibold"
							>Street Address <span class="text-error">*</span></span
						>
					</label>
					<input
						type="text"
						id="address"
						name="address"
						required
						placeholder="123 Main Street"
						class="input-bordered input input-lg"
						class:input-error={form?.field === 'address'}
					/>
				</div>

				<!-- City and Province -->
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div class="form-control">
						<label class="label" for="city">
							<span class="label-text text-base font-semibold"
								>City <span class="text-error">*</span></span
							>
						</label>
						<input
							type="text"
							id="city"
							name="city"
							required
							placeholder="City name"
							class="input-bordered input input-lg"
							class:input-error={form?.field === 'city'}
						/>
					</div>

					<div class="form-control">
						<label class="label" for="province">
							<span class="label-text text-base font-semibold">Province</span>
						</label>
						<input
							type="text"
							id="province"
							name="province"
							placeholder="Optional"
							class="input-bordered input input-lg"
						/>
					</div>
				</div>

				<!-- Hidden fields for coordinates and country -->
				<input type="hidden" name="latitude" required />
				<input type="hidden" name="longitude" required />
				<input type="hidden" name="country" value={data.businessCountry} />

				{#if selectedLocation}
					<div class="alert alert-success">
						<IconMap class="h-6 w-6" />
						<span class="text-base font-medium">Location coordinates set from search</span>
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="mt-10 flex justify-end gap-3">
				<a href="/locations" class="btn btn-ghost">Cancel</a>
				<button
					type="submit"
					disabled={isSubmitting || !selectedImage}
					class="btn gap-2.5 btn-primary"
				>
					{#if isSubmitting}
						<span class="loading loading-md loading-spinner"></span>
						Creating...
					{:else}
						<IconSave class="h-5 w-5" />
						Create Location
					{/if}
				</button>
			</div>
		</div>
	</form>
</BaseLayout>
