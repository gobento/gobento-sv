<!-- src/lib/components/PriceDisplay.svelte -->
<script lang="ts">
	interface Props {
		originalValue: number;
		price: number;
		country: string;
		paymentFeePercent?: number;
		showFinalPrice?: boolean;
		size?: 'sm' | 'lg';
	}

	let {
		originalValue,
		price,
		country,
		paymentFeePercent = 5,
		showFinalPrice = true,
		size = 'lg'
	}: Props = $props();

	const formatPrice = (amount: number, countryCode: string) => {
		if (countryCode === 'Iran') {
			return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
		}
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: 'EUR'
		}).format(amount);
	};

	const discountPercent = $derived(Math.round(((originalValue - price) / originalValue) * 100));

	const finalPrice = $derived(price * (1 + paymentFeePercent / 100));

	// Size-dependent classes
	const badgeClass = $derived(size === 'sm' ? 'badge-sm px-2 py-2' : 'badge-lg px-3 py-3');
	const originalPriceClass = $derived(size === 'sm' ? 'text-sm' : 'text-lg');
	const mainPriceClass = $derived(size === 'sm' ? 'text-xl' : 'text-3xl');
	const feeTextClass = $derived(size === 'sm' ? 'text-xs' : 'text-sm');
	const totalPriceClass = $derived(size === 'sm' ? 'text-base' : 'text-xl');
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
			{formatPrice(originalValue, country)}
		</div>
	</div>

	<!-- Offer Price -->
	<div class="{mainPriceClass} font-bold text-primary">
		{formatPrice(price, country)}
	</div>

	<!-- Final Price with Fee -->
	{#if showFinalPrice && paymentFeePercent > 0}
		<div class="flex flex-col items-end gap-1">
			<div class="{feeTextClass} text-base-content/60">
				+ {paymentFeePercent}% service fee
			</div>
			<div class="{totalPriceClass} font-semibold text-base-content">
				Total: {formatPrice(finalPrice, country)}
			</div>
		</div>
	{/if}
</div>
