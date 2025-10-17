<script lang="ts">
	let { children } = $props();
</script>

<div
	class="flex min-h-dvh w-dvw items-center justify-center p-4"
	style="font-family:'HP Simplified'"
>
	<div class="flex w-full flex-col sm:w-3xl">
		{@render children()}
	</div>

	UNAUTHORIZED
</div>
