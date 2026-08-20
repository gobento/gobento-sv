<!-- src/lib/components/ui/Spinner.svelte -->
<script lang="ts">
	import type { Size } from './tokens';

	interface Props {
		size?: Size;
		/** Announced to screen readers; leave empty when a nearby label already says it. */
		label?: string;
		class?: string;
	}

	let { size = 'md', label = '', class: className = '' }: Props = $props();

	const SIZES: Record<Size, string> = {
		xs: 'loading-xs',
		sm: 'loading-sm',
		md: 'loading-md',
		lg: 'loading-lg'
	};
</script>

<span class="loading loading-spinner {SIZES[size]} {className}" aria-hidden="true"></span>
{#if label}
	<span class="sr-only">{label}</span>
{/if}
