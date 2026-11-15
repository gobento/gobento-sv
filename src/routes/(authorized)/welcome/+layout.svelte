<script lang="ts">
	let { children } = $props();
</script>

<div class="page-view flex min-h-[calc(100dvh-env(safe-area-inset-top))] justify-center">
	<div class="flex w-full flex-col p-6 sm:w-lg">
		{@render children()}
	</div>
</div>
