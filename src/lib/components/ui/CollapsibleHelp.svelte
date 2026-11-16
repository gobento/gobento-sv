<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconQuestionCircle from '~icons/fluent/question-circle-24-regular';
	import IconChevron from '~icons/fluent/chevron-down-24-regular';

	interface Props {
		title?: string;
		/** Start expanded. */
		open?: boolean;
		children: Snippet;
	}

	let { title = 'Need help?', open = false, children }: Props = $props();
</script>

<details class="group rounded-2xl bg-base-200/60" {open}>
	<summary
		class="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-bold select-none [&::-webkit-details-marker]:hidden"
	>
		<IconQuestionCircle class="size-5 shrink-0 text-secondary" />
		<span class="flex-1">{title}</span>
		<IconChevron
			class="size-4 shrink-0 text-base-content/50 transition-transform duration-200 ease-spring group-open:rotate-180"
		/>
	</summary>
	<div class="animate-fade-in px-3.5 pb-3.5 text-sm text-base-content/70">
		{@render children()}
	</div>
</details>
