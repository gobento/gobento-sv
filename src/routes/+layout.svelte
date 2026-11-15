<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import { onNavigate } from '$app/navigation';
	import Toaster from '#lib/components/ui/Toaster.svelte';

	let { children } = $props();

	// Cross-fade between pages where the browser supports view transitions.
	// Same-page navigations (filters, tabs) skip it so they stay instant.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		if (navigation.from?.url.pathname === navigation.to?.url.pathname) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<title>GoBento • Save food and money</title>
</svelte:head>

{@render children()}

<Toaster />
