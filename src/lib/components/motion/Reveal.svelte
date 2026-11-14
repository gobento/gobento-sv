<!-- src/lib/components/motion/Reveal.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Entrance animation: 'rise' slides up, 'pop' scales in with a spring. */
		variant?: 'rise' | 'pop';
		/** Delay in ms — pass index * step for a staggered list. */
		delay?: number;
		class?: string;
		children?: Snippet;
		[key: string]: unknown;
	}

	let { variant = 'rise', delay = 0, class: className = '', children, ...rest }: Props = $props();

	const animation = $derived(variant === 'pop' ? 'animate-pop-in' : 'animate-rise-in');
</script>

<div class="{animation} {className}" style:animation-delay="{delay}ms" {...rest}>
	{@render children?.()}
</div>
