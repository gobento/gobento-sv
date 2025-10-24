<!-- src/routes/(dock)/locations/[id]/edit/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconSave from '~icons/fluent/save-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconImage from '~icons/fluent/image-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';

	let { data, form } = $props();

	let isSaving = $state(false);
	let uploadError = $state<string | null>(null);
	let uploadSuccess = $state(false);
	let currentImageUrl = $state(data.locationImageUrl);
	let isRemovingImage = $state(false);

	// Form fields
	let name = $state(data.location.name);
	let address = $state(data.location.address);
	let city = $state(data.location.city);
	let province = $state(data.location.state || '');
	let zipCode = $state(data.location.zipCode);
	let country = $state(data.location.country);
	let latitude = $state(data.location.latitude);
	let longitude = $state(data.location.longitude);

	function handleUploadSuccess(result: { url: string }) {
		uploadError = null;
		uploadSuccess = true;
		currentImageUrl = result.url;
		setTimeout(() => {
			uploadSuccess = false;
		}, 3000);
	}

	function handleUploadError(error: string) {
		uploadError = error;
		uploadSuccess = false;
	}
</script>

<div class="mx-auto max-w-4xl">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/locations/{data.location.id}" class="btn btn-circle btn-ghost btn-sm">
				<IconArrowLeft class="size-5" />
			</a>
			<div>
				<h1 class="text-2xl font-bold">Edit Location</h1>
				<p class="text-sm text-base-content/60">{data.business.name}</p>
			</div>
		</div>
	</div>

	<div class="grid gap-8 lg:grid-cols-3">
		<!-- Main Form -->
		<div class="lg:col-span-2">
			<div class="card border border-base-300 bg-base-100">
				<div class="card-body">
					<h2 class="mb-4 card-title">
						<IconLocation class="size-6" />
						Location Details
					</h2>

					<form
						method="POST"
						action="?/updateLocation"
						use:enhance={() => {
							isSaving = true;
							return async ({ result, update }) => {
								isSaving = false;
								await update();
								if (result.type === 'success') {
									goto(`/locations/${data.location.id}`);
								}
							};
						}}
						class="space-y-6"
					>
						<!-- Location Name -->
						<div class="form-control">
							<label for="name" class="label">
								<span class="label-text font-medium">Location Name</span>
							</label>
							<input
								id="name"
								name="name"
								type="text"
								bind:value={name}
								placeholder="e.g., Downtown Branch"
								class="input-bordered input w-full"
								required
							/>
						</div>

						<!-- Address -->
						<div class="form-control">
							<label for="address" class="label">
								<span class="label-text font-medium">Street Address</span>
							</label>
							<input
								id="address"
								name="address"
								type="text"
								bind:value={address}
								placeholder="123 Main Street"
								class="input-bordered input w-full"
								required
							/>
						</div>

						<!-- City & State -->
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="form-control">
								<label for="city" class="label">
									<span class="label-text font-medium">City</span>
								</label>
								<input
									id="city"
									name="city"
									type="text"
									bind:value={city}
									placeholder="New York"
									class="input-bordered input w-full"
									required
								/>
							</div>

							<div class="form-control">
								<label for="state" class="label">
									<span class="label-text font-medium">State/Province</span>
									<span class="label-text-alt">Optional</span>
								</label>
								<input
									id="state"
									name="state"
									type="text"
									bind:value={province}
									placeholder="NY"
									class="input-bordered input w-full"
								/>
							</div>
						</div>

						<!-- Zip Code & Country -->
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="form-control">
								<label for="zipCode" class="label">
									<span class="label-text font-medium">Zip/Postal Code</span>
								</label>
								<input
									id="zipCode"
									name="zipCode"
									type="text"
									bind:value={zipCode}
									placeholder="10001"
									class="input-bordered input w-full"
									required
								/>
							</div>

							<div class="form-control">
								<label for="country" class="label">
									<span class="label-text font-medium">Country</span>
								</label>
								<input
									id="country"
									name="country"
									type="text"
									bind:value={country}
									placeholder="United States"
									class="input-bordered input w-full"
									required
								/>
							</div>
						</div>

						<!-- Coordinates -->
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="form-control">
								<label for="latitude" class="label">
									<span class="label-text font-medium">Latitude</span>
								</label>
								<input
									id="latitude"
									name="latitude"
									type="number"
									step="any"
									bind:value={latitude}
									placeholder="40.7128"
									class="input-bordered input w-full"
									required
								/>
							</div>

							<div class="form-control">
								<label for="longitude" class="label">
									<span class="label-text font-medium">Longitude</span>
								</label>
								<input
									id="longitude"
									name="longitude"
									type="number"
									step="any"
									bind:value={longitude}
									placeholder="-74.0060"
									class="input-bordered input w-full"
									required
								/>
							</div>
						</div>

						<!-- Error Message -->
						{#if form?.error}
							<div class="alert alert-error">
								<span>{form.error}</span>
							</div>
						{/if}

						<!-- Submit Button -->
						<div class="flex justify-end gap-3">
							<a href="/locations/{data.location.id}" class="btn btn-ghost">Cancel</a>
							<button type="submit" class="btn gap-2 btn-primary" disabled={isSaving}>
								{#if isSaving}
									<span class="loading loading-sm loading-spinner"></span>
									Saving...
								{:else}
									<IconSave class="size-5" />
									Save Changes
								{/if}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>

		<!-- Image Upload Sidebar -->
		<div class="lg:col-span-1">
			<div class="card border border-base-300 bg-base-100">
				<div class="card-body">
					<h2 class="mb-4 card-title">
						<IconImage class="size-6" />
						Location Image
					</h2>

					<!-- Current Image Preview -->
					{#if currentImageUrl}
						<div class="mb-4">
							<div class="relative overflow-hidden rounded-lg">
								<img
									src={currentImageUrl}
									alt="Location"
									class="aspect-video w-full object-cover"
								/>
							</div>
							<form
								method="POST"
								action="?/removeImage"
								use:enhance={() => {
									isRemovingImage = true;
									return async ({ result, update }) => {
										isRemovingImage = false;
										await update();
										if (result.type === 'success') {
											currentImageUrl = null;
										}
									};
								}}
							>
								<button
									type="submit"
									class="btn mt-3 w-full gap-2 btn-outline btn-sm btn-error"
									disabled={isRemovingImage}
								>
									{#if isRemovingImage}
										<span class="loading loading-xs loading-spinner"></span>
										Removing...
									{:else}
										<IconDelete class="size-4" />
										Remove Image
									{/if}
								</button>
							</form>
						</div>
					{/if}

					<!-- Upload Form -->
					<FileUpload
						action="?/uploadImage"
						acceptedTypes="image/*"
						maxSizeBytes={5 * 1024 * 1024}
						onSuccess={handleUploadSuccess}
						onError={handleUploadError}
						uploadCooldownMs={2000}
					/>

					<!-- Upload Messages -->
					{#if uploadSuccess}
						<div class="alert alert-success">
							<span>Image uploaded successfully!</span>
						</div>
					{/if}

					{#if uploadError}
						<div class="alert alert-error">
							<span>{uploadError}</span>
						</div>
					{/if}

					<div class="mt-4">
						<p class="text-xs text-base-content/60">
							Upload a photo of your location. This will be displayed on your location's page.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
