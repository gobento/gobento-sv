<!-- /src/routes/(public)/+layout.svelte -->
<script lang="ts">
	let { children } = $props();
	import { locales, localizeHref } from '$lib/paraglide/runtime';
</script>

<div class="w-full max-w-lg p-8">
	{@render children()}
</div>

<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>
