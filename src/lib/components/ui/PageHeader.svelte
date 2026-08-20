<!-- src/lib/components/ui/PageHeader.svelte -->
<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import IconTile from './IconTile.svelte';

	interface Props {
		title: string;
		description?: string;
		icon?: Component;
		/** Rendered on the right of the title row, e.g. a primary action. */
		actions?: Snippet;
		class?: string;
	}

	let { title, description, icon, actions, class: className = '' }: Props = $props();
</script>

<div class="mb-8 flex flex-wrap items-start justify-between gap-4 {className}">
	<div class="min-w-0">
		<div class="flex items-center gap-3">
			{#if icon}
				<IconTile {icon} />
			{/if}
			<h1 class="text-3xl font-bold tracking-tight">{title}</h1>
		</div>
		{#if description}
			<p class="mt-2 text-base-content/60">{description}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>
	{/if}
</div>
