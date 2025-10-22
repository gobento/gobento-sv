<script lang="ts">
	import { goto } from '$app/navigation';

	let { children } = $props();
</script>

<div class="flex w-full flex-col p-6 sm:w-3xl">
	{@render children()}
</div>
