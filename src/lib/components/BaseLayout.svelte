<!-- src/lib/components/BaseLayout.svelte -->
<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';

	interface Props {
		title: string;
		description?: string;
		icon?: Component;
		backHref?: string;
		backLabel?: string;
		/** `narrow` suits forms and single-column detail pages. */
		width?: 'default' | 'narrow';
		actions?: Snippet;
		children?: Snippet;
	}

	let {
		title,
		description,
		icon,
		backHref,
		backLabel,
		width = 'default',
		actions,
		children
	}: Props = $props();
</script>

<div class={width === 'narrow' ? 'page-narrow' : 'page'}>
	<PageHeader {title} {description} {icon} {backHref} {backLabel} {actions} />

	{@render children?.()}
</div>
