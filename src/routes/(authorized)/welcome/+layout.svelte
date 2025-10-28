<script lang="ts">
	import { goto } from '$app/navigation';

	let { children } = $props();
</script>

<div class="flex w-full flex-col p-6 sm:w-lg">
	{@render children()}
</div>
