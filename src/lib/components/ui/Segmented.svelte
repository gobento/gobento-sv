<!-- src/lib/components/ui/Segmented.svelte -->
<!-- Pill-shaped switch between a few views, with a sliding thumb. -->
<script lang="ts" generics="T extends string">
	interface Option {
		value: T;
		label: string;
		count?: number;
	}

	interface Props {
		options: Option[];
		value: T;
		label: string;
		onchange?: (value: T) => void;
		class?: string;
	}

	let { options, value = $bindable(), label, onchange, class: className = '' }: Props = $props();

	const index = $derived(
		Math.max(
			0,
			options.findIndex((option) => option.value === value)
		)
	);

	function select(next: T) {
		if (next === value) return;
		value = next;
		onchange?.(next);
	}
</script>

<div
	role="tablist"
	aria-label={label}
	class="relative grid rounded-full bg-base-300/60 p-1 {className}"
	style:grid-template-columns="repeat({options.length}, minmax(0, 1fr))"
>
	<span
		class="absolute inset-y-1 start-1 rounded-full bg-base-100 shadow-soft transition-transform duration-300 ease-spring-soft rtl:[--dir:-1]"
		style:width="calc((100% - 0.5rem) / {options.length})"
		style:transform="translateX(calc({index * 100}% * var(--dir, 1)))"
		aria-hidden="true"
	></span>
	{#each options as option (option.value)}
		<button
			type="button"
			role="tab"
			aria-selected={option.value === value}
			class="relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition-colors {option.value ===
			value
				? 'text-base-content'
				: 'text-base-content/55'}"
			onclick={() => select(option.value)}
		>
			<span class="truncate">{option.label}</span>
			{#if option.count !== undefined}
				<span
					class="tabular rounded-full px-1.5 text-xs {option.value === value
						? 'bg-primary/12 text-primary'
						: 'bg-base-content/8'}">{option.count}</span
				>
			{/if}
		</button>
	{/each}
</div>
