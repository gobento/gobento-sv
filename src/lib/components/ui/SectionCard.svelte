<!-- src/lib/components/ui/SectionCard.svelte -->
<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import Card from './Card.svelte';
	import IconTile from './IconTile.svelte';
	import type { Tone } from './tokens';

	interface Props {
		title: string;
		description?: string;
		icon?: Component;
		tone?: Tone;
		/** Rendered on the right of the header, e.g. an "Add" button. */
		actions?: Snippet;
		class?: string;
		bodyClass?: string;
		children: Snippet;
	}

	let {
		title,
		description,
		icon,
		tone = 'primary',
		actions,
		class: className = '',
		bodyClass = 'gap-6',
		children
	}: Props = $props();
</script>

<Card class={className} {bodyClass}>
	<div class="flex items-start gap-3">
		{#if icon}
			<IconTile {icon} {tone} />
		{/if}
		<div class="min-w-0 flex-1">
			<h2 class="text-base font-semibold">{title}</h2>
			{#if description}
				<p class="text-sm text-base-content/60">{description}</p>
			{/if}
		</div>
		{#if actions}
			<div class="flex shrink-0 items-center gap-2">{@render actions()}</div>
		{/if}
	</div>

	{@render children()}
</Card>
