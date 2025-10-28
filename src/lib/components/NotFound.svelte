<!-- src/lib/components/NotFound.svelte -->
<script lang="ts">
	import type { Component } from 'svelte';

	interface Props {
		icon: Component;
		title: string;
		description: string;
		actionLabel?: string;
		actionHref?: string;
		actionIcon?: Component;
	}

	let { icon, title, description, actionLabel, actionHref, actionIcon }: Props = $props();
</script>

<div class="card rounded-lg bg-base-200">
	<div class="card-body items-center py-20 text-center">
		<div class="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10">
			<svelte:component this={icon} class="size-12 text-primary/60" />
		</div>
		<h2 class="mb-3 text-lg font-bold">{title}</h2>
		<p class="mb-8 max-w-lg text-lg text-base-content/60">
			{description}
		</p>
		{#if actionLabel && actionHref}
			<a href={actionHref} class="btn gap-2.5 btn-primary">
				{#if actionIcon}
					<svelte:component this={actionIcon} class="size-5" />
				{/if}
				{actionLabel}
			</a>
		{/if}
	</div>
</div>
