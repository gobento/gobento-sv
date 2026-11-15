<!-- The one offer card: discover, favourites, location and business pages all use it. -->
<script lang="ts">
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconFire from '~icons/fluent/fire-24-filled';
	import IconBag from '~icons/fluent/shopping-bag-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import { formatDistance, formatPrice } from '#lib/util.js';
	import { currencyFor, discountPercent, pickupWindow } from './format';

	export interface OfferCardData {
		id: string;
		name: string;
		price: number;
		originalValue: number;
		pickupTimeFrom: string;
		pickupTimeUntil: string;
		isRecurring?: boolean;
		imageUrl?: string | null;
		distance?: number | null;
		/** Bags still free to reserve; omit when unknown. */
		available?: number | null;
		isActive?: boolean;
	}

	interface Props {
		offer: OfferCardData;
		/** Shown as the logo + name row; leave out on pages that are already about one business. */
		business?: { name: string; logoUrl?: string | null } | null;
		/** Secondary line under the title, e.g. the location name on a business page. */
		caption?: string | null;
		country?: string | null;
		/** Small ribbon over the photo, e.g. "Biggest discount". */
		highlight?: string | null;
		/** Position in its list: staggers the entrance. */
		index?: number;
		/** Load the photo eagerly (first cards above the fold). */
		priority?: boolean;
		now?: Date;
		class?: string;
	}

	let {
		offer,
		business = null,
		caption = null,
		country = null,
		highlight = null,
		index = 0,
		priority = false,
		now = new Date(),
		class: className = ''
	}: Props = $props();

	const currency = $derived(currencyFor(country));
	const discount = $derived(discountPercent(offer.originalValue, offer.price));
	const pickup = $derived(pickupWindow(offer, now));
	const paused = $derived(offer.isActive === false);
	const soldOut = $derived(offer.available != null && offer.available <= 0);
	const unavailable = $derived(paused || soldOut || pickup.ended);
	const fewLeft = $derived(
		!unavailable && offer.available != null && offer.available <= 3 ? offer.available : null
	);
	const closingSoon = $derived(
		!unavailable && pickup.minutesLeft !== null && pickup.minutesLeft <= 45
	);

	let imageFailed = $state(false);
</script>

<a
	href="/offers/{offer.id}"
	class="group surface pressable stagger flex animate-rise-in flex-col overflow-hidden hover:border-primary/30 {className}"
	style:--i={Math.min(index, 8)}
	aria-label="{offer.name}{business ? ` from ${business.name}` : ''}"
>
	<div class="relative aspect-[5/3] overflow-hidden bg-base-200">
		{#if offer.imageUrl && !imageFailed}
			<img
				src={offer.imageUrl}
				alt=""
				loading={priority ? 'eager' : 'lazy'}
				fetchpriority={priority ? 'high' : 'auto'}
				decoding="async"
				class="size-full object-cover transition-transform duration-500 ease-out-quint group-hover:scale-105 {unavailable
					? 'opacity-60 saturate-50'
					: ''}"
				onerror={() => (imageFailed = true)}
			/>
		{:else}
			<div class="flex size-full items-center justify-center bg-primary/8 text-primary/40">
				<IconBag class="size-12" />
			</div>
		{/if}

		<div class="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
			<div class="flex flex-col items-start gap-1.5">
				{#if discount > 0}
					<span
						class="tabular rounded-full bg-secondary px-2.5 py-1 text-xs font-extrabold text-secondary-content shadow-soft"
					>
						-{discount}%
					</span>
				{/if}
				{#if highlight}
					<span
						class="rounded-full bg-base-100/92 px-2.5 py-1 text-xs font-extrabold text-primary shadow-soft backdrop-blur"
					>
						{highlight}
					</span>
				{/if}
			</div>

			{#if paused}
				<span class="rounded-full bg-neutral px-2.5 py-1 text-xs font-bold text-neutral-content">
					Paused
				</span>
			{:else if soldOut}
				<span class="rounded-full bg-neutral px-2.5 py-1 text-xs font-bold text-neutral-content">
					Sold out
				</span>
			{:else if fewLeft !== null}
				<span
					class="tabular flex items-center gap-1 rounded-full bg-base-100/92 px-2.5 py-1 text-xs font-extrabold text-error shadow-soft backdrop-blur"
				>
					<IconFire class="size-3.5" />
					{fewLeft} left
				</span>
			{/if}
		</div>
	</div>

	<div class="flex flex-1 flex-col gap-1 p-3.5">
		{#if business}
			<div class="flex items-center gap-2">
				{#if business.logoUrl}
					<img
						src={business.logoUrl}
						alt=""
						loading="lazy"
						decoding="async"
						class="size-6 shrink-0 rounded-full bg-base-200 object-cover ring-1 ring-base-300"
					/>
				{/if}
				<span class="min-w-0 flex-1 truncate text-xs font-bold text-base-content/60">
					{business.name}
				</span>
				{#if offer.distance != null}
					<span class="tabular flex shrink-0 items-center gap-0.5 text-xs font-bold text-base-content/60">
						<IconLocation class="size-3.5" />
						{formatDistance(offer.distance)}
					</span>
				{/if}
			</div>
		{/if}

		<h3 class="truncate leading-snug font-extrabold tracking-tight">{offer.name}</h3>

		{#if caption}
			<p class="truncate text-xs text-base-content/60">{caption}</p>
		{/if}

		<div class="mt-auto flex items-end justify-between gap-3 pt-2">
			<span
				class="tabular flex min-w-0 items-center gap-1.5 text-sm font-semibold {closingSoon
					? 'text-error'
					: 'text-base-content/70'}"
			>
				<IconClock class="size-4 shrink-0" />
				<span class="truncate">{pickup.label}</span>
			</span>

			<span class="flex shrink-0 items-baseline gap-1.5">
				{#if discount > 0}
					<span class="tabular text-xs text-base-content/50 line-through">
						{formatPrice(offer.originalValue, currency)}
					</span>
				{/if}
				<span class="tabular text-lg leading-none font-extrabold tracking-tight text-primary">
					{formatPrice(offer.price, currency)}
				</span>
			</span>
		</div>
	</div>
</a>
