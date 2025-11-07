<!-- src/lib/components/PriceDisplay.svelte -->
<script lang="ts">
	import { get } from 'lodash-es';
	import { formatPrice } from '$lib/util';

	interface Props {
		originalValue: number;
		price: number;
		country: string;

		size?: 'sm' | 'lg';
	}

	let { originalValue, price, country, size = 'lg' }: Props = $props();

	const discountPercent = $derived(Math.round(((originalValue - price) / originalValue) * 100));

	// Size-dependent classes
	const badgeClass = $derived(size === 'sm' ? 'badge-sm px-2 py-2' : 'badge-lg px-3 py-3');
	const originalPriceClass = $derived(size === 'sm' ? 'text-sm' : 'text-lg');
	const mainPriceClass = $derived(size === 'sm' ? 'text-xl' : 'text-3xl');

	// todo: create a big map with country codes and currencies
	function getCurrencyFromCountry(country: string) {
		if (country === 'Iran') {
			return 'IRR';
		} else {
			return 'EUR';
		}
	}

	const currency = getCurrencyFromCountry(country);
</script>

<div class="flex flex-col items-end gap-2">
	<!-- Discount Badge & Original Value -->
	<div class="flex items-center gap-{size === 'sm' ? '2' : '3'}">
		<!-- Discount Badge -->
		<div class="badge badge-primary {badgeClass} font-bold shadow-md">
			-{discountPercent}%
		</div>

		<!-- Original Value (Crossed Out) -->
		<div class="{originalPriceClass} text-base-content/50 line-through">
			{formatPrice(originalValue, currency)}
		</div>
	</div>

	<!-- Offer Price -->
	<div class="{mainPriceClass} font-bold text-primary">
		{formatPrice(price, currency)}
	</div>
</div>
