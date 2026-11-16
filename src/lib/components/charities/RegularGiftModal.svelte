<!-- The business's "give on a schedule" dialog, self-contained. -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { FOOD_TYPES, FOOD_TYPE_LABELS } from '#lib/foodTypes.js';
	import {
		GIFT_FREQUENCIES,
		GIFT_FREQUENCY_LABELS,
		WEEKDAYS,
		MAX_DAY_OF_MONTH,
		ordinal
	} from '#lib/recurringGifts.js';
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import type { CharitySummary, LocationOption } from './types';

	interface Props {
		charity: CharitySummary;
		locations: LocationOption[];
		onClose: () => void;
	}

	let { charity, locations, onClose }: Props = $props();

	let frequency = $state<(typeof GIFT_FREQUENCIES)[number]>('weekly');
	let sending = $state(false);
	let error = $state<string | null>(null);
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const todayIso = (() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	})();
</script>

<div class="modal modal-open">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Give regularly to {charity.name}</h3>
		<p class="mt-1 text-sm text-base-content/60">
			They accept the schedule once. After that each pickup is booked automatically three days
			ahead, and you can pause or end the gift at any time.
		</p>

		<form
			method="POST"
			action="?/proposeGift"
			class="mt-4 space-y-4"
			use:enhance={() => {
				sending = true;
				error = null;
				return async ({ result, update }) => {
					sending = false;
					if (result.type === 'success') {
						await update();
						onClose();
					} else if (result.type === 'failure') {
						const err = result.data as { gift?: { error?: string } };
						error = err?.gift?.error ?? 'Failed to set up the regular gift';
					}
				};
			}}
		>
			<input type="hidden" name="charityAccountId" value={charity.accountId} />
			<input type="hidden" name="timeZone" value={timeZone} />

			<div class="form-control">
				<span class="mb-1 block text-sm font-medium">How often</span>
				<div class="join w-full">
					{#each GIFT_FREQUENCIES as freq (freq)}
						<input
							class="btn join-item flex-1 btn-sm"
							type="radio"
							name="frequency"
							value={freq}
							aria-label={GIFT_FREQUENCY_LABELS[freq]}
							bind:group={frequency}
							disabled={sending}
						/>
					{/each}
				</div>
			</div>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
				{#if frequency === 'monthly'}
					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="gift-day">Day of month</label>
						<select
							id="gift-day"
							name="dayOfMonth"
							class="select-bordered select"
							disabled={sending}
						>
							{#each Array.from({ length: MAX_DAY_OF_MONTH }, (_, i) => i + 1) as d (d)}
								<option value={d}>{ordinal(d)}</option>
							{/each}
						</select>
					</div>
				{:else}
					<div class="form-control">
						<label class="mb-1 block text-sm font-medium" for="gift-weekday">Weekday</label>
						<select
							id="gift-weekday"
							name="weekday"
							class="select-bordered select"
							value={String(new Date().getDay())}
							disabled={sending}
						>
							{#each WEEKDAYS as day, i (day)}
								<option value={String(i)}>{day}</option>
							{/each}
						</select>
					</div>
				{/if}
				<div class="form-control">
					<label class="mb-1 block text-sm font-medium" for="gift-from">Pickup from</label>
					<input
						id="gift-from"
						name="pickupTimeFrom"
						type="time"
						class="input-bordered input"
						value="18:00"
						required
						disabled={sending}
					/>
				</div>
				<div class="form-control">
					<label class="mb-1 block text-sm font-medium" for="gift-until">until</label>
					<input
						id="gift-until"
						name="pickupTimeUntil"
						type="time"
						class="input-bordered input"
						value="19:00"
						required
						disabled={sending}
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div class="form-control">
					<label class="mb-1 block text-sm font-medium" for="gift-location">Location</label>
					<select
						id="gift-location"
						name="locationId"
						class="select-bordered select"
						disabled={sending}
					>
						{#if locations.length !== 1}<option value="">No specific location</option>{/if}
						{#each locations as loc (loc.id)}
							<option value={loc.id}>{loc.name} — {loc.city}</option>
						{/each}
					</select>
				</div>
				<div class="form-control">
					<label class="mb-1 block text-sm font-medium" for="gift-food">Food type</label>
					<select id="gift-food" name="foodType" class="select-bordered select" disabled={sending}>
						<option value="">Mixed</option>
						{#each FOOD_TYPES as type (type)}
							<option
								value={type}
								selected={charity.foodTypes.length === 1 && charity.foodTypes[0] === type}
								>{FOOD_TYPE_LABELS[type]}</option
							>
						{/each}
					</select>
				</div>
				<div class="form-control">
					<label class="mb-1 block text-sm font-medium" for="gift-start">Starting</label>
					<input
						id="gift-start"
						name="startsOn"
						type="date"
						class="input-bordered input"
						min={todayIso}
						value={todayIso}
						disabled={sending}
					/>
				</div>
			</div>

			<div class="form-control">
				<label class="mb-1 block text-sm font-medium" for="gift-message"
					>What you usually have</label
				>
				<textarea
					id="gift-message"
					name="message"
					class="textarea-bordered textarea h-20 w-full resize-none"
					placeholder="e.g. Unsold bread and pastries from the day, usually 2–3 crates."
					required
					disabled={sending}></textarea>
			</div>

			{#if error}
				<div class="alert alert-error">
					<IconInfo class="size-5 shrink-0" />
					<span class="text-sm">{error}</span>
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
						<IconRepeat class="size-4" />
						Propose regular gift
					{/if}
				</button>
			</div>
		</form>
	</div>
	<button class="modal-backdrop" onclick={onClose} aria-label="Close"></button>
</div>
