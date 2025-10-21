<!-- /src/routes/(public)/+layout.svelte -->
<script lang="ts">
	let { children } = $props();
</script>

<div class="w-full max-w-lg p-8">
	{@render children()}
</div>
