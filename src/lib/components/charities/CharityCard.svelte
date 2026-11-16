<!-- A charity a business can give surplus food to. -->
<script lang="ts">
	import Card from '#lib/components/ui/Card.svelte';
	import { FOOD_TYPE_LABELS } from '#lib/foodTypes.js';
	import IconMail from '~icons/fluent/mail-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconSend from '~icons/fluent/send-24-regular';
	import type { CharitySummary } from './types';

	const statusLabels: Record<string, string> = {
		pending: 'Request pending',
		accepted: 'Accepted',
		declined: 'Declined',
		cancelled: 'Cancelled',
		completed: 'Completed'
	};

	interface Props {
		charity: CharitySummary;
		onGift: (charity: CharitySummary) => void;
		onRequest: (charity: CharitySummary) => void;
		/** Position in a list, for a gentle staggered entrance. */
		index?: number;
	}

	let { charity, onGift, onRequest, index }: Props = $props();
</script>

<Card bodyClass="gap-4" class="animate-rise-in stagger" style="--i: {index ?? 0}">
	<div class="flex items-center gap-3">
		<div class="avatar">
			<div class="w-12 rounded-xl ring ring-base-300">
				<img src={charity.logoUrl} alt={charity.name} />
			</div>
		</div>
		<div class="min-w-0 flex-1">
			<h2 class="truncate font-semibold">{charity.name}</h2>
			<p class="text-xs text-base-content/60">{charity.country}</p>
		</div>
	</div>

	<p class="line-clamp-3 text-sm text-base-content/70">{charity.description}</p>

	{#if charity.foodTypes.length > 0}
		<div class="flex flex-wrap gap-1.5">
			{#each charity.foodTypes as type (type)}
				<span class="badge badge-outline badge-sm">{FOOD_TYPE_LABELS[type]}</span>
			{/each}
		</div>
	{:else}
		<p class="text-xs text-base-content/50 italic">No food preferences set</p>
	{/if}

	<div class="flex items-center gap-1.5 text-xs text-base-content/60">
		<IconMail class="size-4" />
		<a class="link" href="mailto:{charity.contactEmail}">{charity.contactEmail}</a>
	</div>

	<div class="card-actions items-center justify-between">
		{#if charity.lastRequestStatus}
			<span class="badge badge-ghost badge-sm"
				>{statusLabels[charity.lastRequestStatus] ?? charity.lastRequestStatus}</span
			>
		{:else}
			<span></span>
		{/if}
		<div class="flex flex-wrap justify-end gap-2">
			{#if charity.giftStatus}
				<span class="badge gap-1 badge-outline badge-sm badge-primary">
					<IconRepeat class="size-3" />
					{charity.giftStatus === 'proposed' ? 'Regular gift proposed' : 'Regular gift'}
				</span>
			{:else}
				<button class="btn gap-2 btn-outline btn-sm" onclick={() => onGift(charity)}>
					<IconRepeat class="size-4" />
					Give regularly
				</button>
			{/if}
			<button class="btn gap-2 btn-primary btn-sm" onclick={() => onRequest(charity)}>
				<IconSend class="size-4" />
				Request pickup
			</button>
		</div>
	</div>
</Card>
