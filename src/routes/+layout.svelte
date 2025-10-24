<script lang="ts">
	import CookieBanner from '$lib/components/CookieBanner.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<div
	class="flex min-h-dvh max-w-lvw items-center justify-center"
	style="font-family:'HP Simplified'"
>
	{@render children()}
</div>

<CookieBanner />
