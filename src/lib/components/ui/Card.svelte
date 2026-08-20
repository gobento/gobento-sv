<!-- src/lib/components/ui/Card.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cx } from './tokens';

	interface Props {
		/** `none` skips the card-body wrapper for cards that lay out their own content. */
		padding?: 'none' | 'sm' | 'md' | 'lg';
		surface?: 'base' | 'muted';
		/** Adds the hover affordance used by cards that link somewhere. */
		interactive?: boolean;
		/** Renders the whole card as a link. */
		href?: string;
		class?: string;
		bodyClass?: string;
		children: Snippet;
		[key: string]: unknown;
	}

	let {
		padding = 'md',
		surface = 'base',
		interactive = false,
		href,
		class: className = '',
		bodyClass = '',
		children,
		...rest
	}: Props = $props();

	const PADDING = {
		none: '',
		sm: 'p-4',
		md: 'p-6',
		lg: 'p-8'
	};

	const classes = $derived(
		cx(
			'card border border-base-300 shadow-sm',
			surface === 'muted' ? 'bg-base-200' : 'bg-base-100',
			(interactive || href) &&
				'transition-all duration-200 hover:border-primary/40 hover:shadow-md',
			className
		)
	);

	const bodyClasses = $derived(cx('card-body', PADDING[padding], bodyClass));
</script>

{#if href}
	<a {href} class={classes} {...rest}>
		{#if padding === 'none'}
			{@render children()}
		{:else}
			<div class={bodyClasses}>{@render children()}</div>
		{/if}
	</a>
{:else}
	<div class={classes} {...rest}>
		{#if padding === 'none'}
			{@render children()}
		{:else}
			<div class={bodyClasses}>{@render children()}</div>
		{/if}
	</div>
{/if}
