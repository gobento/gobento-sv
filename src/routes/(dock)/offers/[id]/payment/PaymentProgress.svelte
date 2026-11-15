<!-- Three-step checkout indicator shared by the checkout and USDT transfer pages. -->
<script lang="ts">
	import IconCheck from '~icons/fluent/checkmark-24-filled';

	interface Props {
		/** 1-based index of the current step */
		current: number;
		steps?: string[];
	}

	let { current, steps = ['Choose', 'Pay', 'Done'] }: Props = $props();
</script>

<ol class="flex items-start" aria-label="Checkout progress">
	{#each steps as label, i (label)}
		{@const stepNum = i + 1}
		{@const done = stepNum < current}
		{@const active = stepNum === current}

		<li
			class="flex flex-col items-center gap-1.5 {i < steps.length - 1 ? 'flex-1' : ''}"
			aria-current={active ? 'step' : undefined}
		>
			<div class="flex w-full items-center">
				<div
					class="tabular flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-[background-color,color,box-shadow] duration-300
					{done
						? 'bg-primary text-primary-content'
						: active
							? 'bg-primary/12 text-primary ring-2 ring-primary'
							: 'bg-base-300/60 text-base-content/45'}"
				>
					{#if done}
						<IconCheck class="size-4 animate-pop-in" />
					{:else}
						{stepNum}
					{/if}
				</div>
				{#if i < steps.length - 1}
					<div class="mx-2 h-1 flex-1 overflow-hidden rounded-full bg-base-300/60">
						<div
							class="h-full origin-left rounded-full bg-primary transition-transform duration-500 ease-out-quint rtl:origin-right {done
								? 'scale-x-100'
								: 'scale-x-0'}"
						></div>
					</div>
				{/if}
			</div>
			<span
				class="self-start text-xs font-bold transition-colors {active
					? 'text-primary'
					: done
						? 'text-base-content/70'
						: 'text-base-content/45'}"
			>
				{label}
			</span>
		</li>
	{/each}
</ol>
