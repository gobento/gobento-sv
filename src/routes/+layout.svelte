<script lang="ts">
	import { onMount } from 'svelte';
	import { pwaInfo } from 'virtual:pwa-info';

	onMount(async () => {
		if (pwaInfo) {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({
				immediate: true,
				onRegistered(r) {
					// uncomment following code if you want check for updates
					// r && setInterval(() => {
					//    console.log('Checking for sw update')
					//    r.update()
					// }, 20000 /* 20s for testing purposes */)
					console.log(`SW Registered: ${r}`);
				},
				onRegisterError(error) {
					console.log('SW registration error', error);
				}
			});
		}
	});

	// Convert $: to $derived for Svelte 5 runes mode
	const webManifest = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	import CookieBanner from '$lib/components/CookieBanner.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	{@html webManifest}
</svelte:head>

<div
	class="flex min-h-dvh max-w-lvw items-center justify-center"
	style="font-family:'HP Simplified'"
>
	{@render children()}
</div>

<CookieBanner />
