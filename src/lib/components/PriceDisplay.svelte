<!-- src/lib/components/PriceDisplay.svelte -->
<script lang="ts">
	import { formatPrice } from '#lib/util.js';

	interface Props {
		originalValue: number;
		price: number;
		/** Business country; decides the display currency when none is given. */
		country?: string;
		currency?: string;
		size?: 'sm' | 'lg';
		/** Hide the "-X%" badge when the discount is already shown elsewhere. */
		showDiscountBadge?: boolean;
	}

	let {
		originalValue,
		price,
		country = '',
		currency,
		size = 'lg',
		showDiscountBadge = true
	}: Props = $props();

	const discountPercent = $derived(
		originalValue > 0 ? Math.round(((originalValue - price) / originalValue) * 100) : 0
	);
	const displayCurrency = $derived(currency ?? (country === 'Iran' ? 'IRR' : 'EUR'));
</script>

<div class="flex flex-col items-end {size === 'sm' ? 'gap-0.5' : 'gap-1'}">
	<div class="flex items-center {size === 'sm' ? 'gap-1.5' : 'gap-2'}">
		{#if showDiscountBadge && discountPercent > 0}
			<span
				class="rounded-full bg-secondary font-extrabold text-secondary-content {size === 'sm'
					? 'px-1.5 py-0.5 text-[11px]'
					: 'px-2.5 py-1 text-sm'}"
			>
				-{discountPercent}%
			</span>
		{/if}
		<span
			class="tabular text-base-content/50 line-through {size === 'sm' ? 'text-xs' : 'text-base'}"
		>
			{formatPrice(originalValue, displayCurrency)}
		</span>
	</div>

	<span
		class="tabular leading-none font-extrabold tracking-tight text-primary {size === 'sm'
			? 'text-xl'
			: 'text-3xl'}"
	>
		{formatPrice(price, displayCurrency)}
	</span>
</div>
