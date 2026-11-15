<!-- src/lib/components/NotFound.svelte -->
<script lang="ts">
	import type { Component } from 'svelte';
	import EmptyState from './ui/EmptyState.svelte';

	interface Props {
		icon: Component;
		title: string;
		description: string;
		actionLabel?: string;
		actionHref?: string;
		actionIcon?: Component;
	}

	let props: Props = $props();
</script>

<EmptyState {...props} />
