<!-- src/routes/(dock)/offers/new/+page.svelte -->

<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import IconTag from '~icons/fluent/tag-20-regular';
	import IconArrowLeft from '~icons/fluent/arrow-left-20-regular';
	import IconSave from '~icons/fluent/save-20-regular';
	import IconLocation from '~icons/fluent/location-20-regular';
	import IconGlobe from '~icons/fluent/globe-20-regular';
	import IconMoney from '~icons/fluent/money-20-regular';

	let { data } = $props();
	let form = $page.form;
	let isSubmitting = $state(false);
	let selectedLocationId = $state(data.preselectedLocationId || '');

	// Form values for preview
	let offerName = $state('');
	let offerDescription = $state('');
	let offerPrice = $state('0');
	let offerCurrency = $state('EUR');
</script>

<div class="min-h-screen bg-base-200/50">
	<div class="container mx-auto px-4 py-6 max-w-6xl">
		<!-- Header -->
		<div class="mb-6">
			<a href="/offers" class="btn btn-ghost btn-sm gap-2 mb-4">
				<IconArrowLeft class="w-4 h-4" />
				Back to Offers
			</a>

			<div class="flex items-center gap-4">
				<div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
					<IconTag class="w-7 h-7 text-primary" />
				</div>
				<div>
					<h1 class="text-2xl font-bold">Create New Offer</h1>
					<p class="text-sm text-base-content/60">Add a special offer for your customers</p>
				</div>
			</div>
		</div>

		{#if form?.message}
			<div class="alert alert-error mb-6 shadow-lg">
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

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Form Section -->
			<form
				method="POST"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
						isSubmitting = false;
					};
				}}
				class="lg:col-span-2 space-y-6"
			>
				<!-- Location Card -->
				<div class="card bg-base-100 shadow-sm">
					<div class="card-body">
						<h2 class="card-title text-lg">
							<IconLocation class="w-5 h-5" />
							Location
						</h2>

						<div class="form-control">
							<label class="label">
								<span class="label-text">Where is this offer available?</span>
							</label>
							<select
								id="locationId"
								name="locationId"
								bind:value={selectedLocationId}
								class="select select-bordered w-full"
								class:select-error={form?.field === 'locationId'}
							>
								<option value="">🌍 All Locations</option>
								{#each data.locations as location}
									<option value={location.id}>
										📍 {location.name} - {location.city}{#if location.state}, {location.state}{/if}
									</option>
								{/each}
							</select>
							{#if selectedLocationId === ''}
								<label class="label">
									<span class="label-text-alt text-base-content/60">
										This offer will be available at all your locations
									</span>
								</label>
							{/if}
						</div>

						{#if data.locations.length === 0}
							<div class="alert alert-warning mt-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="stroke-current shrink-0 h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
								<div class="text-sm">
									<div class="font-semibold">No locations yet</div>
									<div>
										<a href="/locations/new" class="link link-primary">Add a location</a> to create location-specific
										offers
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Offer Details Card -->
				<div class="card bg-base-100 shadow-sm">
					<div class="card-body">
						<h2 class="card-title text-lg">
							<IconTag class="w-5 h-5" />
							Offer Details
						</h2>

						<div class="space-y-4">
							<!-- Offer Name -->
							<div class="form-control">
								<label class="label">
									<span class="label-text font-medium">
										Offer Name <span class="text-error">*</span>
									</span>
								</label>
								<input
									type="text"
									id="name"
									name="name"
									bind:value={offerName}
									required
									placeholder="e.g., 20% Off All Services"
									class="input input-bordered w-full"
									class:input-error={form?.field === 'name'}
								/>
								<label class="label">
									<span class="label-text-alt text-base-content/60">
										A catchy name that grabs attention
									</span>
								</label>
							</div>

							<!-- Description -->
							<div class="form-control">
								<label class="label">
									<span class="label-text font-medium">
										Description <span class="text-error">*</span>
									</span>
								</label>
								<textarea
									id="description"
									name="description"
									bind:value={offerDescription}
									required
									rows="4"
									placeholder="Describe your offer in detail. Include terms, conditions, and expiration dates..."
									class="textarea textarea-bordered w-full"
									class:textarea-error={form?.field === 'description'}
								></textarea>
								<label class="label">
									<span class="label-text-alt text-base-content/60">
										Provide clear details about what customers get
									</span>
								</label>
							</div>
						</div>
					</div>
				</div>

				<!-- Pricing Card -->
				<div class="card bg-base-100 shadow-sm">
					<div class="card-body">
						<h2 class="card-title text-lg">
							<IconMoney class="w-5 h-5" />
							Pricing
						</h2>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div class="form-control md:col-span-2">
								<label class="label">
									<span class="label-text font-medium">
										Price <span class="text-error">*</span>
									</span>
								</label>
								<input
									type="number"
									id="price"
									name="price"
									bind:value={offerPrice}
									required
									step="0.01"
									min="0"
									placeholder="0.00"
									class="input input-bordered w-full"
									class:input-error={form?.field === 'price'}
								/>
							</div>

							<div class="form-control">
								<label class="label">
									<span class="label-text font-medium">
										Currency <span class="text-error">*</span>
									</span>
								</label>
								<select
									id="currency"
									name="currency"
									bind:value={offerCurrency}
									class="select select-bordered w-full"
									class:select-error={form?.field === 'currency'}
								>
									<option value="EUR">EUR (€)</option>
									<option value="USD">USD ($)</option>
									<option value="GBP">GBP (£)</option>
									<option value="CHF">CHF (Fr)</option>
									<option value="JPY">JPY (¥)</option>
								</select>
							</div>
						</div>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex justify-end gap-3">
					<a href="/offers" class="btn btn-ghost">Cancel</a>
					<button type="submit" disabled={isSubmitting} class="btn btn-primary gap-2">
						{#if isSubmitting}
							<span class="loading loading-spinner loading-sm"></span>
							Creating...
						{:else}
							<IconSave class="w-5 h-5" />
							Create Offer
						{/if}
					</button>
				</div>
			</form>

			<!-- Preview Section -->
			<div class="lg:col-span-1">
				<div class="card bg-base-100 shadow-sm sticky top-6">
					<div class="card-body">
						<div class="flex items-center gap-2 mb-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5 text-base-content/70"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
								/>
							</svg>
							<h3 class="font-semibold text-base">Live Preview</h3>
						</div>

						<!-- Preview Card -->
						<div
							class="card bg-gradient-to-br from-primary/5 to-secondary/5 border border-base-300"
						>
							<div class="card-body p-5">
								<h4 class="font-bold text-lg">
									{offerName || 'Your Offer Name'}
								</h4>

								<p class="text-sm text-base-content/70 line-clamp-3 min-h-[3.6rem]">
									{offerDescription ||
										'Your offer description will appear here. Add details to see the preview.'}
								</p>

								<div class="flex items-center justify-between mt-3 pt-3 border-t border-base-300">
									<div class="text-2xl font-bold text-success">
										{parseFloat(offerPrice || '0').toFixed(2)}
										{offerCurrency}
									</div>

									{#if selectedLocationId === ''}
										<div class="badge badge-primary gap-1">
											<IconGlobe class="w-3 h-3" />
											All Locations
										</div>
									{:else}
										<div class="badge badge-info gap-1">
											<IconLocation class="w-3 h-3" />
											Specific
										</div>
									{/if}
								</div>

								{#if selectedLocationId !== ''}
									<div class="text-xs text-base-content/60 mt-2 flex items-center gap-1">
										<IconLocation class="w-3 h-3" />
										<span>
											{data.locations.find((l) => l.id === selectedLocationId)?.name || 'Location'}
										</span>
									</div>
								{/if}
							</div>
						</div>

						<div class="alert alert-info mt-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								class="stroke-current shrink-0 w-5 h-5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
							<span class="text-sm">This is how customers will see your offer</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
