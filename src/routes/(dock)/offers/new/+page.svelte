<!-- src/routes/(dock)/offers/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconCheck from '~icons/fluent/checkmark-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconCamera from '~icons/fluent/camera-24-regular';
	import IconMoney from '~icons/fluent/money-24-regular';
	import IconBag from '~icons/fluent/shopping-bag-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconTimer from '~icons/fluent/timer-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';

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
		class="mx-auto max-w-2xl space-y-6 pb-28"
	>
		<!-- Offer Image -->
		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body gap-6">
				<div class="flex items-start gap-3">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
					>
						<IconCamera class="size-5" />
					</div>
					<div class="flex-1">
						<div class="flex items-center justify-between gap-3">
							<h2 class="text-base font-semibold">Offer Photo</h2>
							<span class="badge badge-ghost badge-sm text-error">Required</span>
						</div>
						<p class="text-sm text-base-content/60">
							Show customers what to expect from this offer
						</p>
					</div>
				</div>

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
						class="group relative w-full overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 active:scale-[0.99]"
						class:border-primary={dragActive}
						class:bg-primary-5={dragActive}
						class:border-base-300={!dragActive && !selectedImage}
						class:border-success={selectedImage && !dragActive}
						class:hover:border-primary={!isSubmitting}
						class:hover:bg-base-200={!isSubmitting && !selectedImage}
						class:opacity-50={isSubmitting}
						class:border-error={form?.field === 'offerImage'}
					>
						{#if !selectedImage}
							<div class="flex min-h-[220px] flex-col items-center justify-center gap-4 p-6">
								<div
									class="rounded-2xl bg-base-200 p-4 transition-transform duration-200 group-hover:scale-110"
								>
									<IconCamera class="size-9 text-base-content/40" />
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
										<p class="mt-1 text-sm text-base-content/60">
											Drag & drop or browse • JPG or PNG • 5MB max
										</p>
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
									class="btn absolute top-3 right-3 btn-circle btn-sm"
									aria-label="Remove image"
								>
									✕
								</button>
							</div>
							<div class="flex items-center gap-2 border-t border-base-300 p-3 text-left">
								<div class="badge gap-1 badge-sm badge-success">
									<IconCheck class="size-3" />
									Ready
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium" title={selectedImage.name}>
										{selectedImage.name}
									</p>
									<p class="text-xs text-base-content/60">
										{Math.round(selectedImage.size / 1024)} KB
									</p>
								</div>
							</div>
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- Basic Information -->
		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body gap-6">
				<div class="flex items-start gap-3">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
					>
						<IconTag class="size-5" />
					</div>
					<div class="flex-1">
						<h2 class="text-base font-semibold">Basic Information</h2>
						<p class="text-sm text-base-content/60">Name and describe your offer</p>
					</div>
				</div>

				<div class="form-control">
					<label for="name" class="mb-1.5 flex items-center justify-between">
						<span class="text-sm font-medium">Offer Name</span>
						<span class="badge badge-ghost badge-sm text-error">Required</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={name}
						class="input-bordered input w-full"
						class:input-error={form?.field === 'name'}
						placeholder="e.g., Surprise Pastry Bag, Fresh Produce Box"
						required
					/>
					<span class="mt-1 text-xs text-base-content/60">Give your offer an appealing name</span>
				</div>

				<div class="form-control">
					<label for="description" class="mb-1.5 flex items-center justify-between">
						<span class="text-sm font-medium">Description</span>
						<span class="badge badge-ghost badge-sm text-error">Required</span>
					</label>
					<textarea
						id="description"
						name="description"
						bind:value={description}
						class="textarea-bordered textarea h-28 w-full resize-none"
						class:textarea-error={form?.field === 'description'}
						placeholder="Describe what customers can expect..."
						required></textarea>
					<span class="mt-1 text-xs text-base-content/60">{description.length} characters</span>
				</div>
			</div>
		</div>

		<!-- Pricing -->
		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body gap-6">
				<div class="flex items-start gap-3">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
					>
						<IconMoney class="size-5" />
					</div>
					<div class="flex-1">
						<h2 class="text-base font-semibold">Pricing</h2>
						<p class="text-sm text-base-content/60">Set the value and your discounted price</p>
					</div>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="form-control">
						<label for="originalValue" class="mb-1.5 flex items-center justify-between">
							<span class="text-sm font-medium">Value of goods</span>
							<span class="badge badge-ghost badge-sm text-error">Required</span>
						</label>
						<label
							class="input-bordered input flex w-full items-center gap-2"
							class:input-error={form?.field === 'originalValue'}
						>
							<span class="text-sm text-base-content/50">{currency}</span>
							<input
								type="number"
								id="originalValue"
								name="originalValue"
								bind:value={originalValue}
								class="grow"
								step="0.01"
								min="0.01"
								placeholder="0.00"
								required
							/>
						</label>
					</div>

					<div class="form-control">
						<label for="price" class="mb-1.5 flex items-center justify-between">
							<span class="text-sm font-medium">Your price</span>
							<span class="badge badge-ghost badge-sm text-error">Required</span>
						</label>
						<label
							class="input-bordered input flex w-full items-center gap-2"
							class:input-error={form?.field === 'price'}
						>
							<span class="text-sm text-base-content/50">{currency}</span>
							<input
								type="number"
								id="price"
								name="price"
								bind:value={price}
								class="grow"
								step="0.01"
								min="0.01"
								placeholder="0.00"
								required
							/>
						</label>
					</div>
				</div>

				<!-- Payment Fee Info -->
				{#if buyerTotal()}
					<div class="rounded-2xl border border-info/20 bg-info/5 p-4">
						<div class="flex items-start gap-3">
							<IconInfo class="size-5 shrink-0 text-info" />
							<div class="flex-1 text-sm">
								<p class="font-semibold">Customer will pay {buyerTotal()} {currency}</p>
								<p class="mt-1 text-base-content/70">
									A {paymentFee.toFixed(2)}
									{currency} platform fee is added at checkout to cover transaction costs and service
									development.
								</p>
							</div>
						</div>
					</div>
				{/if}

				{#if savingsPercentage()}
					<div
						class="flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-content"
					>
						<div>
							<p class="text-sm font-medium text-primary-content/70">Customer savings</p>
							<p class="text-xs text-primary-content/60">Off the original value</p>
						</div>
						<p class="text-3xl font-bold">{savingsPercentage()}%</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Quantity & Location -->
		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body gap-6">
				<div class="flex items-start gap-3">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
					>
						<IconBag class="size-5" />
					</div>
					<div class="flex-1">
						<h2 class="text-base font-semibold">Availability</h2>
						<p class="text-sm text-base-content/60">How many and where customers can pick up</p>
					</div>
				</div>

				<div class="form-control">
					<label for="quantity" class="mb-1.5 flex items-center justify-between">
						<span class="text-sm font-medium">Quantity available</span>
						<span class="badge badge-ghost badge-sm text-error">Required</span>
					</label>
					<input
						type="number"
						id="quantity"
						name="quantity"
						bind:value={quantity}
						class="input-bordered input w-full"
						class:input-error={form?.field === 'quantity'}
						min="1"
						placeholder="1"
						required
					/>
					<span class="mt-1 text-xs text-base-content/60">How many units are available?</span>
				</div>

				<div class="form-control">
					<label for="locationId" class="mb-1.5 flex items-center gap-2">
						<IconLocation class="size-4 text-base-content/50" />
						<span class="text-sm font-medium">Location</span>
					</label>
					<select
						id="locationId"
						name="locationId"
						bind:value={locationId}
						class="select-bordered select w-full"
						class:select-error={form?.field === 'locationId'}
					>
						<option value="">All Locations</option>
						{#each data.locations as location}
							<option value={location.id}>
								{location.name} - {location.city}, {location.province}
							</option>
						{/each}
					</select>
					<span class="mt-1 text-xs text-base-content/60">
						Select a specific location or leave as "All Locations"
					</span>
				</div>
			</div>
		</div>

		<!-- Pickup Times -->
		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body gap-6">
				<div class="flex items-start gap-3">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
					>
						<IconTimer class="size-5" />
					</div>
					<div class="flex-1">
						<h2 class="text-base font-semibold">Pickup Times</h2>
						<p class="text-sm text-base-content/60">Minimum 30-minute pickup window required</p>
					</div>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="form-control">
						<label for="pickupTimeFrom" class="mb-1.5 flex items-center justify-between">
							<span class="text-sm font-medium">Pickup from</span>
							<span class="badge badge-ghost badge-sm text-error">Required</span>
						</label>
						<input
							type="time"
							id="pickupTimeFrom"
							name="pickupTimeFrom"
							bind:value={pickupTimeFrom}
							class="input-bordered input w-full"
							class:input-error={form?.field === 'pickupTimeFrom'}
							required
						/>
					</div>

					<div class="form-control">
						<label for="pickupTimeUntil" class="mb-1.5 flex items-center justify-between">
							<span class="text-sm font-medium">Pickup until</span>
							<span class="badge badge-ghost badge-sm text-error">Required</span>
						</label>
						<input
							type="time"
							id="pickupTimeUntil"
							name="pickupTimeUntil"
							bind:value={pickupTimeUntil}
							class="input-bordered input w-full"
							class:input-error={form?.field === 'pickupTimeUntil'}
							required
						/>
					</div>
				</div>
			</div>
		</div>

		<!-- Recurring & Expiration -->
		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body gap-6">
				<div class="flex items-start gap-3">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
					>
						<IconCalendar class="size-5" />
					</div>
					<div class="flex-1">
						<h2 class="text-base font-semibold">Schedule</h2>
						<p class="text-sm text-base-content/60">Set whether this offer repeats</p>
					</div>
				</div>

				<label
					class="flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition-all duration-200 {isRecurring
						? 'border-primary bg-primary/5'
						: 'border-base-300'}"
				>
					<input
						type="checkbox"
						name="isRecurring"
						bind:checked={isRecurring}
						class="checkbox mt-0.5 shrink-0 checkbox-primary"
					/>
					<div>
						<span class="font-semibold">Recurring Daily Offer</span>
						<p class="text-sm text-base-content/60">
							Offer repeats every day with the same pickup times
						</p>
					</div>
				</label>
				<!-- todo: rethink validUntil, recurring and quantity-->

				{#if isRecurring}
					<div class="form-control">
						<label for="validUntil" class="mb-1.5 flex items-center gap-2">
							<span class="text-sm font-medium">Valid until</span>
							<span class="badge badge-ghost badge-sm">Optional</span>
						</label>
						<input
							type="date"
							id="validUntil"
							name="validUntil"
							bind:value={validUntil}
							class="input-bordered input w-full"
							class:input-error={form?.field === 'validUntil'}
						/>
						<span class="mt-1 text-xs text-base-content/60">Leave empty to default to tomorrow</span
						>
					</div>
				{/if}
			</div>
		</div>

		{#if form?.message}
			<div class="alert alert-error shadow-sm">
				<IconInfo class="size-5 shrink-0" />
				<span class="text-sm">{form.message}</span>
			</div>
		{/if}

		<!-- Sticky Action Bar -->
		<div
			class="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100/95 p-4 backdrop-blur md:ps-58"
		>
			<div class="mx-auto flex max-w-2xl gap-3">
				<a href="/offers" class="btn flex-1 btn-ghost" class:btn-disabled={isSubmitting}>Cancel</a>
				<button
					type="submit"
					class="btn flex-[2] gap-2 btn-primary"
					disabled={isSubmitting || !selectedImage}
				>
					{#if isSubmitting}
						<span class="loading loading-sm loading-spinner"></span>
						Creating...
					{:else}
						<IconCheck class="size-5" />
						Create Offer
					{/if}
				</button>
			</div>
		</div>
	</form>
</BaseLayout>
