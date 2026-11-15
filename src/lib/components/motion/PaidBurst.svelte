<!-- src/lib/components/motion/PaidBurst.svelte -->
<!-- The success tick with a ring of sparks flying out: "it worked, enjoy". -->
<script lang="ts">
	import SuccessCheck from '#lib/components/ui/SuccessCheck.svelte';

	interface Props {
		size?: 'md' | 'lg';
		/** Pieces in the ring. */
		count?: number;
	}

	let { size = 'lg', count = 12 }: Props = $props();
</script>

<div class="relative w-fit shrink-0" class:burst-md={size === 'md'}>
	{#each { length: count } as _, i (i)}
		<span class="spark" style:--a="{(360 / count) * i}deg" style:--d="{120 + i * 22}ms"></span>
	{/each}
	<SuccessCheck {size} />
</div>

<style>
	.spark {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 0.5rem;
		height: 0.5rem;
		margin: -0.25rem;
		border-radius: 9999px;
		background: var(--color-primary);
		opacity: 0;
		pointer-events: none;
		animation: spark 0.9s var(--ease-out-quint) var(--d) both;
		--reach: -4.75rem;
	}

	.burst-md .spark {
		--reach: -3rem;
	}

	.spark:nth-child(3n) {
		background: var(--color-secondary);
	}

	.spark:nth-child(3n + 1) {
		background: var(--color-accent);
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 0.125rem;
	}

	@keyframes spark {
		0% {
			opacity: 1;
			transform: rotate(var(--a)) translateY(0) scale(1);
		}
		100% {
			opacity: 0;
			transform: rotate(var(--a)) translateY(var(--reach)) scale(0.3);
		}
	}
</style>
