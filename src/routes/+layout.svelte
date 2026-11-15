<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import { beforeNavigate, onNavigate } from '$app/navigation';
	import { updated } from '$app/state';
	import Toaster from '#lib/components/ui/Toaster.svelte';
	import InstallPrompt from '#lib/components/InstallPrompt.svelte';

	let { children } = $props();

	// A new deploy is out: fetch the new service worker now, and load the next
	// page fresh so the update lands between pages instead of mid-task.
	$effect(() => {
		if (!updated.current || !('serviceWorker' in navigator)) return;
		navigator.serviceWorker
			.getRegistration()
			.then((registration) => registration?.update())
			.catch(() => {});
	});

	beforeNavigate(({ to, type, willUnload, cancel }) => {
		if (!updated.current || willUnload || !to?.url || type === 'form') return;
		cancel();
		location.href = to.url.href;
	});

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
<InstallPrompt />
