<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>GoBento • Save food and money</title>
</svelte:head>

<div
	class="flex min-h-lvh max-w-lvw items-center justify-center"
	style="font-family:'‘CustomFont’'"
>
	{@render children()}
</div>
