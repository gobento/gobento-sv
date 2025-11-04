<!-- src/routes/(dock)/offers/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconSave from '~icons/fluent/save-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';

	import { env } from '$env/dynamic/public';
	import BaseLayout from '$lib/components/BaseLayout.svelte';

	let { data, form } = $props();

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
	<form method="POST" use:enhance class="space-y-6">
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
						required
					></textarea>
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
								{currency} platform fee is added to cover transaction costs and service development.
								This fee is automatically added at checkout.
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
			<button type="submit" class="btn btn-primary">
				<IconSave class="size-5" />
				Create Offer
			</button>
		</div>
	</form>
</BaseLayout>
