<!-- src/routes/(dock)/offers/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconSave from '~icons/fluent/save-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconCamera from '~icons/fluent/camera-24-regular';

	import { env } from '$env/dynamic/public';
	import BaseLayout from '$lib/components/BaseLayout.svelte';

	let { data, form } = $props();

	let isSubmitting = $state(false);

	// Image upload state
	let selectedImage = $state<File | null>(null);
	let imagePreviewUrl = $state<string | null>(null);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;

	const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		processImage(target.files?.[0]);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		processImage(event.dataTransfer?.files[0]);
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

	$effect(() => {
		return () => {
			if (imagePreviewUrl) {
				URL.revokeObjectURL(imagePreviewUrl);
			}
		};
	});

	let name = $state('');
	let description = $state('');
	let originalValue = $state('');
	let price = $state('');
	let currency = $state('EUR');
	let quantity = $state('1');
	let locationId = $state(data.preselectedLocationId || '');
	let isRecurring = $state(false);
	let pickupTimeFrom = $state('');
	let pickupTimeUntil = $state('');
	let validUntil = $state('');

	// Calculate what the buyer will actually pay
	const paymentFee = parseFloat(env.PUBLIC_PAYMENT_FEE || '0');
	const buyerTotal = $derived(() => {
		const priceNum = parseFloat(price);
		if (isNaN(priceNum) || priceNum <= 0) return null;
		return (priceNum + paymentFee).toFixed(2);
	});

	const savingsPercentage = $derived(() => {
		const orig = parseFloat(originalValue);
		const disc = parseFloat(price);
		if (isNaN(orig) || isNaN(disc) || orig <= 0 || disc <= 0) return null;
		return Math.round(((orig - disc) / orig) * 100);
	});
</script>

<BaseLayout
	title="Create New Offer"
	description="Create a new surprise bag or discounted offer for your customers"
	icon={IconTag}
>
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
		class="space-y-6"
	>
		<!-- Offer Image -->
		<div class="card bg-base-200">
			<div class="card-body">
				<h2 class="card-title">Offer Image</h2>
				<p class="mb-3 text-sm text-base-content/60">
					Upload a photo of what customers can expect from this offer
				</p>

				<div
					class="relative"
					role="button"
					tabindex="-1"
					ondrop={handleDrop}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
				>
					<input
						bind:this={fileInput}
						id="offerImage"
						name="offerImage"
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
						class:border-base-300={!dragActive && !selectedImage}
						class:border-success={selectedImage && !dragActive}
						class:hover:border-primary={!isSubmitting}
						class:hover:bg-base-100={!isSubmitting && !selectedImage}
						class:opacity-50={isSubmitting}
						class:input-error={form?.field === 'offerImage'}
					>
						{#if !selectedImage}
							<div class="flex min-h-[200px] flex-col items-center justify-center gap-3 p-6">
								<div
									class="rounded-full bg-base-100 p-4 transition-transform group-hover:scale-110"
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
											Tap to upload offer photo
										{/if}
									</p>
									{#if !isSubmitting}
										<p class="mt-1 text-sm text-base-content/60">Images only • 5MB max</p>
									{/if}
								</div>
							</div>
						{:else}
							<div class="relative">
								<img src={imagePreviewUrl} alt="Offer preview" class="h-64 w-full object-cover" />
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
		</div>

		<!-- Basic Information -->
		<div class="card bg-base-200">
			<div class="card-body">
				<h2 class="card-title">Basic Information</h2>

				<div class="form-control">
					<label class="label" for="name">
						<span class="label-text">Offer Name</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={name}
						class="input-bordered input"
						class:input-error={form?.field === 'name'}
						placeholder="e.g., Surprise Pastry Bag, Fresh Produce Box"
						required
					/>
					<label class="label">
						<span class="label-text-alt text-base-content/60">
							Give your offer an appealing name
						</span>
					</label>
				</div>

				<div class="form-control">
					<label class="label" for="description">
						<span class="label-text">Description</span>
					</label>
					<textarea
						id="description"
						name="description"
						bind:value={description}
						class="textarea-bordered textarea h-24"
						class:textarea-error={form?.field === 'description'}
						placeholder="Describe what customers can expect..."
						required></textarea>
				</div>
			</div>
		</div>

		<!-- Pricing -->
		<div class="card bg-base-200">
			<div class="card-body">
				<h2 class="card-title">Pricing</h2>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="form-control">
						<label class="label" for="originalValue">
							<span class="label-text">Value of the Goods in this surprise bag</span>
						</label>
						<input
							type="number"
							id="originalValue"
							name="originalValue"
							bind:value={originalValue}
							class="input-bordered input"
							class:input-error={form?.field === 'originalValue'}
							step="0.01"
							min="0.01"
							placeholder="0.00"
							required
						/>
					</div>

					<div class="form-control">
						<label class="label" for="price">
							<span class="label-text">Your Discounted Price</span>
						</label>
						<input
							type="number"
							id="price"
							name="price"
							bind:value={price}
							class="input-bordered input"
							class:input-error={form?.field === 'price'}
							step="0.01"
							min="0.01"
							placeholder="0.00"
							required
						/>
					</div>
				</div>

				<!-- Payment Fee Info -->
				{#if buyerTotal()}
					<div class="alert alert-info">
						<IconInfo class="size-6" />
						<div class="flex-1">
							<p class="font-semibold">Customer will pay: {buyerTotal()} {currency}</p>
							<p class="mt-1 text-sm">
								A {paymentFee.toFixed(2)}
								{currency} platform fee is added to cover transaction costs and service development. This
								fee is automatically added at checkout.
							</p>
						</div>
					</div>
				{/if}

				{#if savingsPercentage()}
					<div class="stats bg-primary text-primary-content shadow">
						<div class="stat">
							<div class="stat-title text-primary-content/70">Customer Savings</div>
							<div class="stat-value">{savingsPercentage()}%</div>
							<div class="stat-desc text-primary-content/70">Off the original value</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Quantity & Location -->
		<div class="card bg-base-200">
			<div class="card-body">
				<h2 class="card-title">Availability</h2>

				<div class="form-control">
					<label class="label" for="quantity">
						<span class="label-text">Quantity Available</span>
					</label>
					<input
						type="number"
						id="quantity"
						name="quantity"
						bind:value={quantity}
						class="input-bordered input"
						class:input-error={form?.field === 'quantity'}
						min="1"
						placeholder="1"
						required
					/>
					<label class="label">
						<span class="label-text-alt text-base-content/60"> How many units are available? </span>
					</label>
				</div>

				<div class="form-control">
					<label class="label" for="locationId">
						<span class="label-text">Location</span>
					</label>
					<select
						id="locationId"
						name="locationId"
						bind:value={locationId}
						class="select-bordered select"
						class:select-error={form?.field === 'locationId'}
					>
						<option value="">All Locations</option>
						{#each data.locations as location}
							<option value={location.id}>
								{location.name} - {location.city}, {location.province}
							</option>
						{/each}
					</select>
					<label class="label">
						<span class="label-text-alt text-base-content/60">
							Select a specific location or leave as "All Locations"
						</span>
					</label>
				</div>
			</div>
		</div>

		<!-- Pickup Times -->
		<div class="card bg-base-200">
			<div class="card-body">
				<h2 class="card-title">Pickup Times</h2>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="form-control">
						<label class="label" for="pickupTimeFrom">
							<span class="label-text">Pickup From</span>
						</label>
						<input
							type="time"
							id="pickupTimeFrom"
							name="pickupTimeFrom"
							bind:value={pickupTimeFrom}
							class="input-bordered input"
							class:input-error={form?.field === 'pickupTimeFrom'}
							required
						/>
					</div>

					<div class="form-control">
						<label class="label" for="pickupTimeUntil">
							<span class="label-text">Pickup Until</span>
						</label>
						<input
							type="time"
							id="pickupTimeUntil"
							name="pickupTimeUntil"
							bind:value={pickupTimeUntil}
							class="input-bordered input"
							class:input-error={form?.field === 'pickupTimeUntil'}
							required
						/>
					</div>
				</div>

				<label class="label">
					<span class="label-text-alt text-base-content/60">
						Minimum 30-minute pickup window required
					</span>
				</label>
			</div>
		</div>

		<!-- Recurring & Expiration -->
		<div class="card bg-base-200">
			<div class="card-body">
				<h2 class="card-title">Schedule</h2>

				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-4">
						<input
							type="checkbox"
							name="isRecurring"
							bind:checked={isRecurring}
							class="checkbox checkbox-primary"
						/>
						<div>
							<span class="label-text font-semibold">Recurring Daily Offer</span>
							<p class="text-sm text-base-content/60">
								Offer repeats every day with the same pickup times
							</p>
						</div>
					</label>
				</div>
				<!-- todo: rethink validUntil, recurring and quantity-->

				{#if isRecurring}
					<div class="form-control">
						<label class="label" for="validUntil">
							<span class="label-text">Valid Until (Optional)</span>
						</label>
						<input
							type="date"
							id="validUntil"
							name="validUntil"
							bind:value={validUntil}
							class="input-bordered input"
							class:input-error={form?.field === 'validUntil'}
						/>
						<label class="label">
							<span class="label-text-alt text-base-content/60">
								Leave empty to default to tomorrow
							</span>
						</label>
					</div>
				{/if}
			</div>
		</div>

		{#if form?.message}
			<div class="mb-4 alert alert-error">
				<IconInfo class="size-6" />
				<span>{form.message}</span>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex justify-end gap-4">
			<a href="/offers" class="btn btn-ghost">Cancel</a>
			<button type="submit" class="btn btn-primary" disabled={isSubmitting || !selectedImage}>
				{#if isSubmitting}
					<span class="loading loading-md loading-spinner"></span>
					Creating...
				{:else}
					<IconSave class="size-5" />
					Create Offer
				{/if}
			</button>
		</div>
	</form>
</BaseLayout>
