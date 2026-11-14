<!-- src/lib/components/motion/AnimatedNumber.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		/** Final value to count up to. */
		value: number;
		/** Decimal places to show (defaults to however many the value has, capped at 2). */
		decimals?: number;
		/** Locale string for grouping (e.g. 'en-US'). Defaults to the browser locale. */
		locale?: string;
		/** Length of the count-up in ms. */
		duration?: number;
		class?: string;
	}

	let {
		value,
		decimals = 0,
		locale = 'en-US',
		duration = 1200,
		class: className = ''
	}: Props = $props();

	let display = $state(0);

	onMount(() => {
		const start = performance.now();
		const tick = (now: number) => {
			const progress = Math.min((now - start) / duration, 1);
			// easeOutExpo: fast start, gentle landing
			const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
			display = value * eased;
			if (progress < 1) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});

	const formatted = $derived(
		display.toLocaleString(locale, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		})
	);
</script>

<span class={className}>{formatted}</span>
