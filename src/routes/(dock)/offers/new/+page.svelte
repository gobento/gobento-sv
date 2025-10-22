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
	import IconCalendar from '~icons/fluent/calendar-20-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-20-regular';
	import IconClock from '~icons/fluent/clock-20-regular';

	let { data } = $props();
	let form = $page.form;
	let isSubmitting = $state(false);
	let selectedLocationId = $state(data.preselectedLocationId || '');

	// Form values for preview
	let offerName = $state('');
	let offerDescription = $state('');
	let offerPrice = $state('0');
	let offerCurrency = $state('EUR');
	let isRecurring = $state(false);
	let validUntil = $state('');
	let pickupTimeFrom = $state('09:00');
	let pickupTimeUntil = $state('17:00');

	const formatDate = (dateStr: string) => {
		if (!dateStr) return '';
		return new Intl.DateTimeFormat('de-DE', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}).format(new Date(dateStr));
	};

	const formatTime = (timeStr: string) => {
		if (!timeStr) return '';
		return timeStr;
	};
</script>

<div class="min-h-screen bg-base-200/50">
	<div class="container mx-auto max-w-6xl px-4 py-6">
		<!-- Header -->
		<div class="mb-6">
			<a href="/offers" class="btn mb-4 gap-2 btn-ghost btn-sm">
				<IconArrowLeft class="h-4 w-4" />
				Back to Offers
			</a>

			<div class="flex items-center gap-4">
				<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
					<IconTag class="h-7 w-7 text-primary" />
				</div>
				<div>
					<h1 class="text-2xl font-bold">Create New Offer</h1>
					<p class="text-sm text-base-content/60">Add a special offer for your customers</p>
				</div>
			</div>
		</div>

		{#if form?.message}
			<div class="mb-6 alert alert-error shadow-lg">
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
				<span>{form.message}</span>
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
				class="space-y-6 lg:col-span-2"
			>
				<!-- Location Card -->
				<div class="card bg-base-100 shadow-sm">
					<div class="card-body">
						<h2 class="card-title text-lg">
							<IconLocation class="h-5 w-5" />
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
								class="select-bordered select w-full"
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
							<div class="mt-2 alert alert-warning">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5 shrink-0 stroke-current"
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
							<IconTag class="h-5 w-5" />
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
									class="input-bordered input w-full"
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
									placeholder="Describe your offer in detail. Include terms, conditions, and what's included..."
									class="textarea-bordered textarea w-full"
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
							<IconMoney class="h-5 w-5" />
							Pricing
						</h2>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
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
									class="input-bordered input w-full"
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
									class="select-bordered select w-full"
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

				<!-- Pickup Times Card -->
				<div class="card bg-base-100 shadow-sm">
					<div class="card-body">
						<h2 class="card-title text-lg">
							<IconClock class="h-5 w-5" />
							Pickup Time Window
						</h2>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div class="form-control">
								<label class="label">
									<span class="label-text font-medium">
										From <span class="text-error">*</span>
									</span>
								</label>
								<input
									type="time"
									id="pickupTimeFrom"
									name="pickupTimeFrom"
									bind:value={pickupTimeFrom}
									required
									class="input-bordered input w-full"
									class:input-error={form?.field === 'pickupTimeFrom'}
								/>
							</div>

							<div class="form-control">
								<label class="label">
									<span class="label-text font-medium">
										Until <span class="text-error">*</span>
									</span>
								</label>
								<input
									type="time"
									id="pickupTimeUntil"
									name="pickupTimeUntil"
									bind:value={pickupTimeUntil}
									required
									class="input-bordered input w-full"
									class:input-error={form?.field === 'pickupTimeUntil'}
								/>
							</div>
						</div>

						<label class="label">
							<span class="label-text-alt text-base-content/60">
								Set the time window when customers can pick up this offer
							</span>
						</label>
					</div>
				</div>

				<!-- Availability Card -->
				<div class="card bg-base-100 shadow-sm">
					<div class="card-body">
						<h2 class="card-title text-lg">
							<IconCalendar class="h-5 w-5" />
							Availability
						</h2>

						<div class="space-y-4">
							<!-- Recurring -->
							<div class="form-control">
								<label class="label cursor-pointer justify-start gap-3">
									<input
										type="checkbox"
										id="isRecurring"
										name="isRecurring"
										bind:checked={isRecurring}
										class="checkbox checkbox-primary"
									/>
									<div class="flex items-center gap-2">
										<IconRepeat class="h-5 w-5 text-base-content/70" />
										<span class="label-text font-medium">Recurring Offer</span>
									</div>
								</label>
								<label class="label">
									<span class="label-text-alt text-base-content/60">
										Users can reserve this offer multiple times
									</span>
								</label>
							</div>

							<!-- Valid Until -->
							<div class="form-control">
								<label class="label">
									<span class="label-text font-medium">Valid Until (Optional)</span>
								</label>
								<input
									type="date"
									id="validUntil"
									name="validUntil"
									bind:value={validUntil}
									class="input-bordered input w-full"
									class:input-error={form?.field === 'validUntil'}
								/>
								<label class="label">
									<span class="label-text-alt text-base-content/60">
										Leave empty if the offer has no expiration date
									</span>
								</label>
							</div>
						</div>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex justify-end gap-3">
					<a href="/offers" class="btn btn-ghost">Cancel</a>
					<button type="submit" disabled={isSubmitting} class="btn gap-2 btn-primary">
						{#if isSubmitting}
							<span class="loading loading-sm loading-spinner"></span>
							Creating...
						{:else}
							<IconSave class="h-5 w-5" />
							Create Offer
						{/if}
					</button>
				</div>
			</form>

			<!-- Preview Section -->
			<div class="lg:col-span-1">
				<div class="card sticky top-6 bg-base-100 shadow-sm">
					<div class="card-body">
						<div class="mb-4 flex items-center gap-2">
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
							<h3 class="text-base font-semibold">Live Preview</h3>
						</div>

						<!-- Preview Card -->
						<div
							class="card border border-base-300 bg-gradient-to-br from-primary/5 to-secondary/5"
						>
							<div class="card-body p-5">
								<h4 class="text-lg font-bold">
									{offerName || 'Your Offer Name'}
								</h4>

								<p class="line-clamp-3 min-h-[3.6rem] text-sm text-base-content/70">
									{offerDescription ||
										'Your offer description will appear here. Add details to see the preview.'}
								</p>

								<div class="mt-3 flex items-center justify-between border-t border-base-300 pt-3">
									<div class="text-2xl font-bold text-success">
										{parseFloat(offerPrice || '0').toFixed(2)}
										{offerCurrency}
									</div>

									<div class="flex gap-2">
										{#if isRecurring}
											<div class="badge gap-1 badge-primary">
												<IconRepeat class="h-3 w-3" />
												Recurring
											</div>
										{/if}

										{#if selectedLocationId === ''}
											<div class="badge gap-1 badge-info">
												<IconGlobe class="h-3 w-3" />
												All
											</div>
										{:else}
											<div class="badge gap-1 badge-info">
												<IconLocation class="h-3 w-3" />
												Location
											</div>
										{/if}
									</div>
								</div>

								<div class="mt-2 flex items-center gap-1 text-xs text-base-content/60">
									<IconClock class="h-3 w-3" />
									<span>
										Pickup: {formatTime(pickupTimeFrom)} - {formatTime(pickupTimeUntil)}
									</span>
								</div>

								{#if validUntil}
									<div class="mt-1 flex items-center gap-1 text-xs text-base-content/60">
										<IconCalendar class="h-3 w-3" />
										<span>Valid until {formatDate(validUntil)}</span>
									</div>
								{/if}

								{#if selectedLocationId !== ''}
									<div class="mt-1 flex items-center gap-1 text-xs text-base-content/60">
										<IconLocation class="h-3 w-3" />
										<span>
											{data.locations.find((l) => l.id === selectedLocationId)?.name || 'Location'}
										</span>
									</div>
								{/if}
							</div>
						</div>

						<div class="mt-4 alert alert-info">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								class="h-5 w-5 shrink-0 stroke-current"
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
