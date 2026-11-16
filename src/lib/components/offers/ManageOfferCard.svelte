<!-- The business-side offer card: image, details and a slot for management actions. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import OptimizedLocationImage from '#lib/components/images/OptimizedLocationImage.svelte';
	import { formatDate, formatTime } from '#lib/util.js';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconBox from '~icons/fluent/box-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconPeople from '~icons/fluent/people-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';

	export interface ManagedOffer {
		id: string;
		name: string;
		description: string;
		price: number;
		originalValue: number | null;
		currency: string;
		isActive: boolean;
		isRecurring: boolean;
		validUntil: string | Date | null;
		quantity: number | null;
		pickupTimeFrom: string | null;
		pickupTimeUntil: string | null;
		reservedCount: number;
		imageUrl: string | null;
		locationId: string | null;
		locationName: string | null;
		locationCity: string | null;
		locationProvince: string | null;
	}

	interface Props {
		offer: ManagedOffer;
		actions: Snippet;
	}

	let { offer, actions }: Props = $props();
</script>

<div
	class="group flex flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg {offer.isActive
		? ''
		: 'opacity-70'}"
>
	<div class="relative h-44 w-full overflow-hidden">
		<OptimizedLocationImage
			src={offer.imageUrl ?? ''}
			alt={offer.name}
			class="h-full w-full transition-transform duration-300 group-hover:scale-105"
		/>
		<div class="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent"></div>

		<div class="absolute top-3 left-3">
			{#if offer.isActive}
				<span class="badge gap-1 border-none badge-sm shadow badge-success">
					<IconCheckmark class="size-3" />
					{#if offer.validUntil}
						Active until {formatDate(offer.validUntil)}
					{:else}
						Active
					{/if}
				</span>
			{:else}
				<span class="badge border-none badge-sm shadow badge-neutral">Inactive</span>
			{/if}
		</div>

		{#if offer.reservedCount > 0}
			<div class="absolute top-3 right-3">
				<span class="badge gap-1 border-none badge-sm shadow badge-warning">
					<IconPeople class="size-3" />
					{offer.reservedCount} reserved
				</span>
			</div>
		{/if}
	</div>

	<div class="flex flex-1 flex-col p-5">
		<h3 class="leading-tight font-semibold">{offer.name}</h3>
		<p class="mt-1 line-clamp-2 text-sm text-base-content/60">{offer.description}</p>

		<div class="mt-4 flex items-baseline gap-2">
			<span class="text-2xl font-bold text-success">
				{offer.price.toFixed(2)}
				{offer.currency}
			</span>
			{#if offer.originalValue && offer.originalValue > offer.price}
				<span class="text-sm text-base-content/40 line-through">
					{offer.originalValue.toFixed(2)}
					{offer.currency}
				</span>
			{/if}
		</div>

		{#if offer.locationId !== null}
			<a
				href={resolve('/(dock)/locations/[id]', { id: offer.locationId })}
				class="mt-4 flex items-start gap-2 rounded-lg border border-info/20 bg-info/5 px-3 py-2 transition-colors hover:bg-info/10"
			>
				<IconLocation class="mt-0.5 size-4 shrink-0 text-info" />
				<div class="min-w-0 text-xs">
					<div class="truncate font-semibold text-info">{offer.locationName}</div>
					<div class="text-base-content/60">
						{offer.locationCity}{#if offer.locationProvince}, {offer.locationProvince}{/if}
					</div>
				</div>
			</a>
		{/if}

		<div class="mt-4 grid grid-cols-1 gap-2 text-xs text-base-content/60">
			{#if offer.pickupTimeFrom && offer.pickupTimeUntil}
				<div class="flex items-center gap-2">
					<IconClock class="size-4 shrink-0 text-base-content/40" />
					<span
						>Pickup {formatTime(offer.pickupTimeFrom)} – {formatTime(offer.pickupTimeUntil)}</span
					>
				</div>
			{/if}
			{#if offer.quantity}
				<div class="flex items-center gap-2">
					<IconBox class="size-4 shrink-0 text-base-content/40" />
					<span>{offer.quantity} available</span>
				</div>
			{/if}
			{#if offer.isRecurring}
				<div class="flex items-center gap-2">
					<IconRepeat class="size-4 shrink-0 text-base-content/40" />
					<span>Recurring offer</span>
				</div>
			{/if}
		</div>

		<div class="mt-5 space-y-2 border-t border-base-200 pt-4">
			<a
				href={resolve('/(dock)/offers/[id]', { id: offer.id })}
				class="btn btn-block gap-1 btn-outline btn-primary btn-sm"
			>
				View details
				<IconArrowRight class="size-4" />
			</a>
			{@render actions()}
		</div>
	</div>
</div>
