<!-- A business's regular-gift commitment, with its status and schedule actions. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import StatusBadge from '#lib/components/ui/StatusBadge.svelte';
	import { GIFT_STATUS } from '#lib/statuses.js';
	import { FOOD_TYPE_LABELS } from '#lib/foodTypes.js';
	import { formatMoment } from '#lib/components/reservations/pickup.js';
	import type { GiftSummary } from './types';

	type GiftAction = 'pauseGift' | 'resumeGift' | 'endGift';

	interface Props {
		gift: GiftSummary;
		actions: Snippet<[GiftAction]>;
		/** Position in a list, for a gentle staggered entrance. */
		index?: number;
	}

	let { gift, actions, index }: Props = $props();

	const giftActions = (status: string): GiftAction[] => {
		if (status === 'active') return ['pauseGift', 'endGift'];
		if (status === 'paused') return ['resumeGift', 'endGift'];
		return ['endGift'];
	};
</script>

<Card bodyClass="gap-3" class="animate-rise-in stagger" style="--i: {index ?? 0}">
	<div class="flex items-center gap-3">
		<div class="avatar">
			<div class="w-10 rounded-xl ring ring-base-300">
				<img src={gift.logoUrl} alt={gift.charityName} />
			</div>
		</div>
		<div class="min-w-0 flex-1">
			<h3 class="truncate font-semibold">{gift.charityName}</h3>
			<p class="truncate text-sm text-base-content/70">{gift.schedule}</p>
		</div>
		<StatusBadge map={GIFT_STATUS} status={gift.status} />
	</div>
	<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
		{#if gift.locationName}<span>{gift.locationName}</span>{/if}
		{#if gift.foodType}<span>{FOOD_TYPE_LABELS[gift.foodType]}</span>{/if}
		{#if gift.status === 'active' && gift.nextOccurrenceAt}
			<span>Next to be booked: {formatMoment(gift.nextOccurrenceAt)}</span>
		{/if}
		<span>{gift.pickups} {gift.pickups === 1 ? 'pickup' : 'pickups'} so far</span>
	</div>
	<div class="card-actions justify-end">
		{#each giftActions(gift.status) as action (action)}
			{@render actions(action)}
		{/each}
	</div>
</Card>
