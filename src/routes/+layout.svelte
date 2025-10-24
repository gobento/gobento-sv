<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div
	class="flex min-h-dvh max-w-lvw items-center justify-center"
	style="font-family:'HP Simplified'"
>
	{@render children()}
</div>
