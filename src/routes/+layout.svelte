<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate, beforeNavigate, onNavigate } from '$app/navigation';
	import { page, updated } from '$app/state';
	import { markNavigationEnd, markNavigationStart, startTelemetry } from '#lib/client/telemetry.js';
	import Toaster from '#lib/components/ui/Toaster.svelte';
	import InstallPrompt from '#lib/components/layout/InstallPrompt.svelte';

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

	onMount(() => startTelemetry(() => page.route.id));

	afterNavigate(({ type, to }) => {
		if (type !== 'enter') markNavigationEnd(to?.route.id ?? null);
	});

	beforeNavigate(({ to, type, willUnload, cancel }) => {
		if (!willUnload && type !== 'form') markNavigationStart();
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
