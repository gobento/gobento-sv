<!-- src/lib/components/motion/AnimatedNumber.svelte -->
<script lang="ts">
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

	// Start from the real value so server-rendered HTML (and no-JS, reduced
	// motion) shows the right number; the count-up only runs in the browser.
	// svelte-ignore state_referenced_locally
	let display = $state(typeof document === 'undefined' ? value : 0);
	let shown = 0;

	$effect(() => {
		const target = value;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			display = shown = target;
			return;
		}

		const from = shown;
		const start = performance.now();
		let frame = requestAnimationFrame(function tick(now: number) {
			const progress = Math.min((now - start) / duration, 1);
			// easeOutExpo: fast start, gentle landing
			const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
			display = shown = from + (target - from) * eased;
			if (progress < 1) frame = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(frame);
	});

	const formatted = $derived(
		display.toLocaleString(locale, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		})
	);
</script>

<span class="tabular {className}">{formatted}</span>
