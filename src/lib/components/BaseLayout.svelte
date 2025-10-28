<!-- src/lib/components/BaseLayout.svelte -->
<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		icon?: Component;
		children: Snippet;
	}

	let { title, description, icon, children }: Props = $props();
</script>

<div class="mb-10">
	<div class="flex items-center gap-3">
		{#if icon}
			<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10">
				<svelte:component this={icon} class="size-6 text-primary" />
			</div>
		{/if}
		<h1 class="text-3xl font-bold tracking-tight">{title}</h1>
	</div>
	{#if description}
		<p class="mt-2 text-base-content/60">{description}</p>
	{/if}
</div>

{@render children?.()}
