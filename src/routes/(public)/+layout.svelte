<!-- src/routes/(public)/+layout.svelte -->
<script lang="ts">
	let { children } = $props();
</script>

<div
	class="page-view flex min-h-[calc(100dvh-env(safe-area-inset-top))] items-center justify-center"
>
	<div class="w-full max-w-lg p-6 sm:p-8">
		{@render children()}
	</div>
</div>
