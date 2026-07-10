<!-- src/routes/(dock)/offers/[id]/payment/PaymentProgress.svelte -->
<script lang="ts">
	import IconCheck from '~icons/fluent/checkmark-24-filled';

	interface Props {
		/** 1-based index of the current step */
		current: number;
		steps?: string[];
	}

	let { current, steps = ['Method', 'Pay', 'Done'] }: Props = $props();
</script>

<div class="flex items-center">
	{#each steps as label, i (label)}
		{@const stepNum = i + 1}
		{@const done = stepNum < current}
		{@const active = stepNum === current}

		<div class="flex items-center gap-2">
			<div
				class="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all
				{done
					? 'bg-primary text-primary-content'
					: active
						? 'bg-primary/15 text-primary ring-2 ring-primary'
						: 'bg-base-200 text-base-content/40'}"
			>
				{#if done}
					<IconCheck class="size-4" />
				{:else}
					{stepNum}
				{/if}
			</div>
			<span
				class="hidden text-sm font-medium transition-colors sm:inline
				{active ? 'text-primary' : done ? 'text-base-content' : 'text-base-content/40'}"
			>
				{label}
			</span>
		</div>

		{#if i < steps.length - 1}
			<div
				class="mx-2 h-0.5 flex-1 rounded-full transition-colors {done
					? 'bg-primary'
					: 'bg-base-200'}"
			></div>
		{/if}
	{/each}
</div>
