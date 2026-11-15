<!-- src/lib/components/ui/PageHeader.svelte -->
<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import IconBack from '~icons/fluent/chevron-left-24-regular';
	import IconTile from './IconTile.svelte';

	interface Props {
		title: string;
		description?: string;
		icon?: Component;
		/** Shows a back chevron linking here; use on detail and form pages. */
		backHref?: string;
		backLabel?: string;
		/** Rendered on the right of the title row, e.g. a primary action. */
		actions?: Snippet;
		class?: string;
	}

	let {
		title,
		description,
		icon,
		backHref,
		backLabel = 'Back',
		actions,
		class: className = ''
	}: Props = $props();
</script>

<header class="mb-6 animate-rise-in {className}">
	{#if backHref}
		<!-- eslint-disable svelte/no-navigation-without-resolve -- callers pass resolved or external URLs -->
		<a
			href={backHref}
			class="-ms-2 mb-2 inline-flex items-center gap-0.5 rounded-full py-1 ps-1 pe-3 text-sm font-bold text-base-content/60 transition-colors hover:bg-base-300/50 hover:text-base-content"
			><!-- eslint-enable svelte/no-navigation-without-resolve -->
			<IconBack class="size-5 rtl:rotate-180" />
			{backLabel}
		</a>
	{/if}
	<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
		<div class="flex min-w-0 items-center gap-3">
			{#if icon}
				<IconTile {icon} size="lg" />
			{/if}
			<div class="min-w-0">
				<h1 class="text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">{title}</h1>
				{#if description}
					<p class="mt-0.5 text-sm text-base-content/60 sm:text-base">{description}</p>
				{/if}
			</div>
		</div>
		{#if actions}
			<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>
		{/if}
	</div>
</header>
