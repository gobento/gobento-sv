<!-- src/lib/components/BaseLayout.svelte -->
<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';

	interface Props {
		title: string;
		description?: string;
		icon?: Component;
		children: Snippet;
	}

	let { title, description, icon, children }: Props = $props();
</script>

<div class="p-6">
	<div class="animate-rise-in">
		<PageHeader {title} {description} {icon} />
	</div>

	{@render children?.()}
</div>
