<script lang="ts">
	import { page } from '$app/state';
	import '../app.css';
	import { fade } from 'svelte/transition';

	let { children } = $props();
</script>

<svelte:head>
	<title>GoBento • Save food and money</title>
</svelte:head>

{#key page.url}
	<div
		class="flex min-h-lvh max-w-lvw items-center justify-center"
		style="font-family:'Harmattan'"
		transition:fade
	>
		{@render children()}
	</div>
{/key}
