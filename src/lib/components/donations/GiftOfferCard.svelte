<!-- Presentational card for a regular gift a business has offered a charity. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import { FOOD_TYPE_LABELS, isFoodType } from '#lib/foodTypes.js';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';

	export interface GiftOffer {
		businessName: string;
		logoUrl: string;
		schedule: string;
		message: string;
		foodType: string | null;
		locationName: string | null;
		locationAddress: string | null;
	}

	interface Props {
		gift: GiftOffer;
		actions: Snippet;
		/** Position in a list, for a gentle staggered entrance. */
		index?: number;
	}

	let { gift, actions, index }: Props = $props();
</script>

<Card class="animate-rise-in border-primary/30 stagger" style="--i: {index ?? 0}">
	<div class="flex items-start gap-3">
		<div class="avatar">
			<div class="w-12 rounded-xl ring ring-base-300">
				<img src={gift.logoUrl} alt={gift.businessName} />
			</div>
		</div>
		<div class="min-w-0 flex-1">
			<h3 class="font-semibold">{gift.businessName}</h3>
			<p class="text-sm font-medium text-primary">{gift.schedule}</p>
		</div>
	</div>
	<p class="text-sm text-base-content/80">{gift.message}</p>
	<div class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-base-content/70">
		{#if gift.foodType && isFoodType(gift.foodType)}
			<span class="inline-flex items-center gap-1.5">
				<IconTag class="size-4" />{FOOD_TYPE_LABELS[gift.foodType]}
			</span>
		{/if}
		{#if gift.locationName}
			<span class="inline-flex items-center gap-1.5">
				<IconLocation class="size-4" />{gift.locationName}{gift.locationAddress
					? `, ${gift.locationAddress}`
					: ''}
			</span>
		{/if}
	</div>
	<p class="text-xs text-base-content/60">
		Accepting books every pickup for you automatically, three days ahead. You can call off a single
		pickup or stop the gift at any time.
	</p>
	<div class="flex flex-wrap justify-end gap-2">
		{@render actions()}
	</div>
</Card>
