<!-- src/lib/components/ComplaintModal.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconSend from '~icons/fluent/send-24-regular';
	import IconBell from '~icons/fluent/alert-24-regular';

	import Modal from '$lib/components/Modal.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import LocationCard from '$lib/components/maps/LocationCard.svelte';
	import { COMPLAINT_CATEGORIES, COMPLAINT_CATEGORY_LABELS } from '$lib/complaints';

	type LocationContext = {
		name: string;
		address: string;
		city: string;
		province?: string | null;
		zipCode: string;
		country: string;
		latitude: number;
		longitude: number;
	};

	let {
		open = $bindable(false),
		targetType,
		targetName,
		location = null,
		result = null
	}: {
		open: boolean;
		targetType: 'offer' | 'location';
		targetName: string;
		location?: LocationContext | null;
		result?: { success?: boolean; error?: string } | null;
	} = $props();

	let submitting = $state(false);

	const success = $derived(result?.success === true);
</script>

<Modal bind:open title="Report a problem" position="bottom">
	{#if success}
		<Alert type="success" class="mb-4">
			Thanks for letting us know. The company has been notified and will look into it.
		</Alert>
		<button class="btn btn-block btn-primary" onclick={() => (open = false)}>Close</button>
	{:else}
		<p class="mb-4 text-sm text-base-content/60">
			Tell the company what went wrong with <span class="font-semibold">{targetName}</span>.
		</p>

		<!-- Context about what is being reported (with map for locations) -->
		{#if location}
			<div class="mb-4">
				<LocationCard
					name={location.name}
					address={location.address}
					city={location.city}
					province={location.province}
					zipCode={location.zipCode}
					country={location.country}
					latitude={location.latitude}
					longitude={location.longitude}
					showTitle={false}
				/>
			</div>
		{/if}

		<div
			class="mb-4 flex items-start gap-2 rounded-lg bg-base-200 p-3 text-xs text-base-content/70"
		>
			<IconBell class="mt-0.5 size-4 shrink-0 text-primary" />
			<span>The company gets a notification straight away so they can resolve this.</span>
		</div>

		{#if result?.error}
			<Alert type="error" class="mb-4">
				{result.error}
			</Alert>
		{/if}

		<form
			method="POST"
			action="?/submitComplaint"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<div class="form-control mb-4 w-full">
				<label class="label" for="complaint-category">
					<span class="label-text font-medium">What's the problem?</span>
				</label>
				<select
					id="complaint-category"
					name="category"
					required
					class="select-bordered select w-full"
				>
					{#each COMPLAINT_CATEGORIES as category}
						<option value={category}>{COMPLAINT_CATEGORY_LABELS[category]}</option>
					{/each}
				</select>
			</div>

			<div class="form-control mb-6 w-full">
				<label class="label" for="complaint-message">
					<span class="label-text font-medium">Describe what happened</span>
				</label>
				<textarea
					id="complaint-message"
					name="message"
					required
					minlength="10"
					maxlength="1000"
					rows="4"
					class="textarea-bordered textarea w-full"
					placeholder="Give the company enough detail to resolve the issue…"></textarea>
			</div>

			<button type="submit" class="btn btn-block gap-2 btn-primary" disabled={submitting}>
				{#if submitting}
					<span class="loading loading-spinner"></span>
				{:else}
					<IconSend class="size-5" />
				{/if}
				Submit complaint
			</button>
		</form>
	{/if}
</Modal>
