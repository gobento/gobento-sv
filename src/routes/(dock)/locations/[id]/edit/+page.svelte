<!-- src/routes/(dock)/locations/[id]/edit/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconSave from '~icons/fluent/save-20-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconImage from '~icons/fluent/image-24-regular';
	import IconCamera from '~icons/fluent/camera-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';
	import IconError from '~icons/fluent/error-circle-24-regular';

	let { data, form } = $props();

	let isSaving = $state(false);
	let selectedImage = $state<File | null>(null);
	let imagePreviewUrl = $state<string | null>(null);
	let dragActive = $state(false);
	let shouldRemoveImage = $state(false);
	let fileInput: HTMLInputElement;

	const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

	// Form fields
	let name = $state(data.location.name);

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
		shouldRemoveImage = false;

		if (imagePreviewUrl) {
			URL.revokeObjectURL(imagePreviewUrl);
		}

		imagePreviewUrl = URL.createObjectURL(file);
	}

	function clearImage() {
		if (isSaving) return;

		selectedImage = null;

		if (imagePreviewUrl) {
			URL.revokeObjectURL(imagePreviewUrl);
			imagePreviewUrl = null;
		}

		if (fileInput) {
			fileInput.value = '';
		}
	}

	function markImageForRemoval() {
		shouldRemoveImage = true;
		selectedImage = null;
		if (imagePreviewUrl) {
			URL.revokeObjectURL(imagePreviewUrl);
			imagePreviewUrl = null;
		}
	}

	function undoRemoval() {
		shouldRemoveImage = false;
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

<!-- Header -->
<div class="mb-12 flex items-center justify-between">
	<div class="flex items-center gap-5">
		<a href="/locations/{data.location.id}" class="btn btn-circle btn-ghost">
			<IconArrowLeft class="h-6 w-6" />
		</a>
		<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
			<IconLocation class="h-7 w-7 text-primary-content" />
		</div>
		<div>
			<h1 class="text-4xl font-bold tracking-tight">Edit Location</h1>
			<p class="mt-2 text-base text-base-content/60">{data.business.name}</p>
		</div>
	</div>
</div>

<!-- Form -->
<form
	method="POST"
	action="?/updateLocation"
	enctype="multipart/form-data"
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
	class="card border-2 border-base-300 bg-base-100"
>
	<div class="card-body p-8">
		{#if form?.error}
			<div class="mb-6 alert alert-error">
				<IconError class="h-6 w-6 shrink-0" />
				<span class="text-base">{form.error}</span>
			</div>
		{/if}

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
				bind:value={name}
				required
				placeholder="e.g., Downtown Branch, Main Office"
				class="input-bordered input input-lg"
			/>
			<label class="label">
				<span class="label-text-alt text-base-content/60"
					>A friendly name to identify this location</span
				>
			</label>
		</div>

		<div class="space-y-6">
			<!-- Location Image Upload -->
			<div class="form-control">
				<label class="label" for="locationImage">
					<span class="label-text text-base font-semibold">
						<IconImage class="inline h-5 w-5" />
						Location Image
					</span>
				</label>
				<p class="mb-3 text-sm text-base-content/60">
					Upload a photo of your location to help customers find you
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
						name="image"
						type="file"
						accept="image/*"
						class="hidden"
						onchange={handleFileSelect}
						disabled={isSaving}
					/>

					{#if shouldRemoveImage}
						<!-- Image marked for removal -->
						<div class="rounded-lg border-2 border-warning bg-warning/10 p-6 text-center">
							<IconDelete class="mx-auto mb-3 h-10 w-10 text-warning" />
							<p class="mb-2 text-base font-semibold">Image will be removed when you save</p>
							<button
								type="button"
								onclick={undoRemoval}
								disabled={isSaving}
								class="btn btn-ghost btn-sm"
							>
								Undo
							</button>
						</div>
					{:else}
						<button
							type="button"
							onclick={() => fileInput?.click()}
							disabled={isSaving}
							class="group relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200 active:scale-[0.98]"
							class:border-primary={dragActive}
							class:bg-primary-5={dragActive}
							class:border-base-300={!dragActive && !selectedImage && !data.locationImageUrl}
							class:border-success={selectedImage && !dragActive}
							class:bg-success-5={selectedImage && !dragActive}
							class:hover:border-primary={!isSaving}
							class:hover:bg-base-200={!isSaving && !selectedImage && !data.locationImageUrl}
							class:opacity-50={isSaving}
						>
							{#if selectedImage}
								<!-- New image preview -->
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
										disabled={isSaving}
										class="btn absolute top-2 right-2 btn-circle btn-sm"
									>
										✕
									</button>
								</div>
								<div class="border-t border-base-300 bg-success/5 p-3">
									<div class="flex items-center justify-between">
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-medium" title={selectedImage.name}>
												{selectedImage.name}
											</p>
											<p class="text-xs text-base-content/60">
												{Math.round(selectedImage.size / 1024)} KB • New image selected
											</p>
										</div>
									</div>
								</div>
							{:else if data.locationImageUrl}
								<!-- Current image -->
								<div class="relative">
									<img
										src={data.locationImageUrl}
										alt="Current location"
										class="h-64 w-full object-cover"
									/>
									<div
										class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
									>
										<p class="text-lg font-semibold text-white">Tap to change</p>
									</div>
								</div>
								<div class="border-t border-base-300 p-3">
									<p class="text-sm text-base-content/60">Current location image</p>
								</div>
							{:else}
								<!-- No image -->
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
											{:else if isSaving}
												Saving...
											{:else}
												Tap to upload location photo
											{/if}
										</p>
										{#if !isSaving}
											<p class="mt-1 text-sm text-base-content/60">Images only • 5MB max</p>
										{/if}
									</div>
								</div>
							{/if}
						</button>
					{/if}
				</div>
			</div>

			<!-- Read-only Address Information -->
			<div class="divider text-lg font-semibold">Address Information</div>

			<div class="rounded-lg bg-base-200 p-6">
				<div class="space-y-4">
					<div>
						<p class="text-sm font-semibold text-base-content/60">Street Address</p>
						<p class="text-base">{data.location.address}</p>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<p class="text-sm font-semibold text-base-content/60">City</p>
							<p class="text-base">{data.location.city}</p>
						</div>
						{#if data.location.state}
							<div>
								<p class="text-sm font-semibold text-base-content/60">State/Province</p>
								<p class="text-base">{data.location.state}</p>
							</div>
						{/if}
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<p class="text-sm font-semibold text-base-content/60">ZIP/Postal Code</p>
							<p class="text-base">{data.location.zipCode}</p>
						</div>
						<div>
							<p class="text-sm font-semibold text-base-content/60">Country</p>
							<p class="text-base">{data.location.country}</p>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<p class="text-sm font-semibold text-base-content/60">Latitude</p>
							<p class="font-mono text-base">{data.location.latitude}</p>
						</div>
						<div>
							<p class="text-sm font-semibold text-base-content/60">Longitude</p>
							<p class="font-mono text-base">{data.location.longitude}</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="mt-10 flex justify-end gap-3">
			<a href="/locations/{data.location.id}" class="btn btn-ghost btn-lg">Cancel</a>
			<button type="submit" disabled={isSaving} class="btn gap-2.5 btn-lg btn-primary">
				{#if isSaving}
					<span class="loading loading-md loading-spinner"></span>
					Saving...
				{:else}
					<IconSave class="h-5 w-5" />
					Save Changes
				{/if}
			</button>
		</div>
	</div>
</form>
