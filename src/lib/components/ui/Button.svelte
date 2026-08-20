<!-- src/lib/components/ui/Button.svelte -->
<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import Spinner from './Spinner.svelte';
	import { cx, ICON_SIZE, type Size } from './tokens';

	type Variant =
		| 'primary'
		| 'secondary'
		| 'accent'
		| 'neutral'
		| 'info'
		| 'success'
		| 'warning'
		| 'error'
		| 'ghost'
		| 'link'
		/** No colour class at all — for buttons that bring their own surface. */
		| 'plain';

	interface Props {
		variant?: Variant;
		size?: Size;
		/** Outlined version of the chosen variant. */
		outline?: boolean;
		block?: boolean;
		shape?: 'default' | 'circle' | 'square';
		icon?: Component;
		iconRight?: Component;
		/** Swaps the leading icon for a spinner and blocks interaction. */
		loading?: boolean;
		/** Optional label shown while loading, instead of the children. */
		loadingLabel?: string;
		disabled?: boolean;
		/** Renders an anchor instead of a button. */
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		children?: Snippet;
		[key: string]: unknown;
	}

	let {
		variant = 'primary',
		size = 'md',
		outline = false,
		block = false,
		shape = 'default',
		icon,
		iconRight,
		loading = false,
		loadingLabel,
		disabled = false,
		href,
		type = 'button',
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const VARIANTS: Record<Variant, string> = {
		primary: 'btn-primary',
		secondary: 'btn-secondary',
		accent: 'btn-accent',
		neutral: 'btn-neutral',
		info: 'btn-info',
		success: 'btn-success',
		warning: 'btn-warning',
		error: 'btn-error',
		ghost: 'btn-ghost',
		link: 'btn-link',
		plain: ''
	};

	const SIZES: Record<Size, string> = {
		xs: 'btn-xs',
		sm: 'btn-sm',
		md: '',
		lg: 'btn-lg'
	};

	const SPINNER_SIZES: Record<Size, Size> = { xs: 'xs', sm: 'xs', md: 'sm', lg: 'md' };

	const classes = $derived(
		cx(
			'btn gap-2',
			VARIANTS[variant],
			SIZES[size],
			outline && 'btn-outline',
			block && 'btn-block',
			shape === 'circle' && 'btn-circle',
			shape === 'square' && 'btn-square',
			className
		)
	);

	const LeadingIcon = $derived(icon);
	const TrailingIcon = $derived(iconRight);
	const iconClass = $derived(ICON_SIZE[size]);
	const isDisabled = $derived(disabled || loading);
</script>

{#snippet content()}
	{#if loading}
		<Spinner size={SPINNER_SIZES[size]} />
	{:else if LeadingIcon}
		<LeadingIcon class={iconClass} />
	{/if}

	{#if loading && loadingLabel}
		{loadingLabel}
	{:else if children}
		{@render children()}
	{/if}

	{#if TrailingIcon && !loading}
		<TrailingIcon class={iconClass} />
	{/if}
{/snippet}

{#if href}
	<a
		href={isDisabled ? undefined : href}
		class={classes}
		class:btn-disabled={isDisabled}
		aria-disabled={isDisabled || undefined}
		{...rest}
	>
		{@render content()}
	</a>
{:else}
	<button {type} class={classes} disabled={isDisabled} {...rest}>
		{@render content()}
	</button>
{/if}
