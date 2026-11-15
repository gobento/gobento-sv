<!-- A read-only value (error reference, address) with a copy button. -->
<script lang="ts">
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconCheck from '~icons/fluent/checkmark-24-regular';

	interface Props {
		value: string;
		/** What is being copied, for the button's accessible name. */
		label: string;
		class?: string;
	}

	let { value, label, class: className = '' }: Props = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard access can be denied; the value stays selectable.
		}
	}

	$effect(() => () => clearTimeout(timer));
</script>

<div
	class="flex items-center gap-2 rounded-2xl border border-base-300/70 bg-base-100 py-1 ps-3.5 pe-1 {className}"
>
	<code class="min-w-0 flex-1 truncate font-mono text-sm select-all" title={value}>{value}</code>
	<button
		type="button"
		onclick={copy}
		class="btn shrink-0 gap-1.5 btn-ghost btn-sm"
		aria-label="Copy {label.toLowerCase()}"
	>
		{#if copied}
			<IconCheck class="size-4 animate-pop-in text-success" />
			<span aria-live="polite">Copied</span>
		{:else}
			<IconCopy class="size-4" />
			<span>Copy</span>
		{/if}
	</button>
</div>
