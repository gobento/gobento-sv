<!-- src/lib/components/ui/EmptyState.svelte -->
<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import Button from './Button.svelte';
	import Card from './Card.svelte';
	import IconTile from './IconTile.svelte';
	import type { Tone } from './tokens';

	interface Props {
		icon: Component;
		title: string;
		description?: string;
		tone?: Tone;
		/** `sm` for empty states nested inside another card or a column. */
		size?: 'sm' | 'md';
		actionLabel?: string;
		actionHref?: string;
		actionIcon?: Component;
		/** Use instead of actionLabel/actionHref when more than one action is needed. */
		actions?: Snippet;
		class?: string;
	}

	let {
		icon,
		title,
		description,
		tone = 'primary',
		size = 'md',
		actionLabel,
		actionHref,
		actionIcon,
		actions,
		class: className = ''
	}: Props = $props();
</script>

<Card padding="none" class={className}>
	<div
		class="card-body items-center text-center {size === 'sm' ? 'gap-3 py-10' : 'gap-4 py-16'}"
	>
		<IconTile {icon} {tone} size={size === 'sm' ? 'lg' : 'xl'} class="mb-2" />
		<h3 class={size === 'sm' ? 'text-base font-bold' : 'text-xl font-bold'}>{title}</h3>
		{#if description}
			<p class="max-w-md text-base-content/60">{description}</p>
		{/if}
		{#if actions}
			<div class="mt-2 flex flex-wrap items-center justify-center gap-3">{@render actions()}</div>
		{:else if actionLabel && actionHref}
			<Button href={actionHref} icon={actionIcon} class="mt-2">{actionLabel}</Button>
		{/if}
	</div>
</Card>
