<!-- The business's "offer a one-off pickup" dialog, self-contained. -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { FOOD_TYPES, FOOD_TYPE_LABELS } from '#lib/foodTypes.js';
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconSend from '~icons/fluent/send-24-regular';
	import type { CharitySummary, LocationOption, OfferOption } from './types';

	interface Props {
		charity: CharitySummary;
		locations: LocationOption[];
		offers: OfferOption[];
		onClose: () => void;
	}

	let { charity, locations, offers, onClose }: Props = $props();

	let sending = $state(false);
	let formError = $state<string | null>(null);
	let locationId = $state('');

	const availableOffers = $derived(
		locationId ? offers.filter((offer) => offer.locationId === locationId) : offers
	);
</script>

<div class="modal modal-open">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Request a pickup from {charity.name}</h3>
		<p class="mt-1 text-sm text-base-content/60">
			They'll be notified and can accept or decline your request.
		</p>

		<form
			method="POST"
			action="?/requestPickup"
			class="mt-4 space-y-4"
			use:enhance={() => {
				sending = true;
				formError = null;
				return async ({ result, update }) => {
					sending = false;
					if (result.type === 'success') {
						await update();
						onClose();
					} else if (result.type === 'failure') {
						const err = result.data as { request?: { error?: string } };
						formError = err?.request?.error ?? 'Failed to send request';
					}
				};
			}}
		>
			<input type="hidden" name="charityAccountId" value={charity.accountId} />

			<div class="form-control">
				<label class="mb-1 block text-sm font-medium" for="req-message">Message</label>
				<textarea
					id="req-message"
					name="message"
					class="textarea-bordered textarea h-24 w-full resize-none"
					placeholder="Describe the surplus food available and any details the charity should know..."
					required
					disabled={sending}></textarea>
			</div>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div class="form-control">
					<label class="mb-1 block text-sm font-medium" for="req-foodType">Food type</label>
					<select
						id="req-foodType"
						name="foodType"
						class="select-bordered select"
						disabled={sending}
					>
						<option value="">Unspecified</option>
						{#each FOOD_TYPES as type (type)}
							<option value={type}>{FOOD_TYPE_LABELS[type]}</option>
						{/each}
					</select>
				</div>

				<div class="form-control">
					<label class="mb-1 block text-sm font-medium" for="req-location">Location</label>
					<select
						id="req-location"
						name="locationId"
						class="select-bordered select"
						bind:value={locationId}
						disabled={sending}
					>
						<option value="">No specific location</option>
						{#each locations as loc (loc.id)}
							<option value={loc.id}>{loc.name} — {loc.city}</option>
						{/each}
					</select>
				</div>
			</div>

			{#if availableOffers.length > 0}
				<div class="form-control">
					<label class="mb-1 block text-sm font-medium" for="req-offer">Offer (optional)</label>
					<select id="req-offer" name="offerId" class="select-bordered select" disabled={sending}>
						<option value="">No specific offer</option>
						{#each availableOffers as offer (offer.id)}
							<option value={offer.id}>{offer.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div class="form-control">
					<label class="mb-1 block text-sm font-medium" for="req-from">Pickup from</label>
					<input
						id="req-from"
						name="proposedPickupFrom"
						type="datetime-local"
						class="input-bordered input"
						disabled={sending}
					/>
				</div>
				<div class="form-control">
					<label class="mb-1 block text-sm font-medium" for="req-until">Pickup until</label>
					<input
						id="req-until"
						name="proposedPickupUntil"
						type="datetime-local"
						class="input-bordered input"
						disabled={sending}
					/>
				</div>
			</div>

			{#if formError}
				<div class="alert alert-error">
					<IconInfo class="size-5 shrink-0" />
					<span class="text-sm">{formError}</span>
				</div>
			{/if}

			<div class="modal-action">
				<button type="button" class="btn btn-ghost" onclick={onClose} disabled={sending}>
					Cancel
				</button>
				<button type="submit" class="btn gap-2 btn-primary" disabled={sending}>
					{#if sending}
						<span class="loading loading-sm loading-spinner"></span>
						Sending...
					{:else}
						<IconSend class="size-4" />
						Send request
					{/if}
				</button>
			</div>
		</form>
	</div>
	<button class="modal-backdrop" onclick={onClose} aria-label="Close"></button>
</div>
