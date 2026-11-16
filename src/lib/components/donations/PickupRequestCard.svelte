<!-- Presentational card for a business's one-off pickup request to a charity. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import StatusBadge from '#lib/components/ui/StatusBadge.svelte';
	import { PICKUP_STATUS } from '#lib/statuses.js';
	import { FOOD_TYPE_LABELS, isFoodType } from '#lib/foodTypes.js';
	import { formatDateTime } from '#lib/dates.js';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';

	export interface PickupRequest {
		status: string;
		businessName: string;
		logoUrl: string;
		createdAt: string | Date;
		message: string;
		foodType: string | null;
		offerName: string | null;
		locationName: string | null;
		locationCity: string | null;
		proposedPickupFrom: string | Date | null;
		proposedPickupUntil: string | Date | null;
	}

	interface Props {
		req: PickupRequest;
		actions: Snippet;
		/** Position in a list, for a gentle staggered entrance. */
		index?: number;
	}

	let { req, actions, index }: Props = $props();

	const formatDate = (value: string | Date | null) => (value ? formatDateTime(value) : '');
</script>

<Card class="animate-rise-in stagger" style="--i: {index ?? 0}">
	<div class="flex items-start gap-3">
		<div class="avatar">
			<div class="w-12 rounded-xl ring ring-base-300">
				<img src={req.logoUrl} alt={req.businessName} />
			</div>
		</div>
		<div class="min-w-0 flex-1">
			<h3 class="font-semibold">{req.businessName}</h3>
			<p class="text-xs text-base-content/60">Requested {formatDate(req.createdAt)}</p>
		</div>
		<StatusBadge map={PICKUP_STATUS} status={req.status} />
	</div>
	<p class="text-sm text-base-content/80">{req.message}</p>
	<div class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-base-content/70">
		{#if req.foodType && isFoodType(req.foodType)}
			<span class="inline-flex items-center gap-1.5">
				<IconTag class="size-4" />
				{FOOD_TYPE_LABELS[req.foodType]}
			</span>
		{/if}
		{#if req.offerName}
			<span class="inline-flex items-center gap-1.5">
				<IconTag class="size-4" />
				{req.offerName}
			</span>
		{/if}
		{#if req.locationName}
			<span class="inline-flex items-center gap-1.5">
				<IconLocation class="size-4" />
				{req.locationName}{req.locationCity ? `, ${req.locationCity}` : ''}
			</span>
		{/if}
		{#if req.proposedPickupFrom}
			<span class="inline-flex items-center gap-1.5">
				<IconClock class="size-4" />
				{formatDate(req.proposedPickupFrom)}
				{#if req.proposedPickupUntil}– {formatDate(req.proposedPickupUntil)}{/if}
			</span>
		{/if}
	</div>
	<div class="flex flex-wrap justify-end gap-2">
		{@render actions()}
	</div>
</Card>
