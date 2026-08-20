<!-- src/lib/components/ui/FormField.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconAlert from '~icons/fluent/error-circle-24-regular';

	interface Props {
		label: string;
		/** id of the control this label points at. */
		for?: string;
		required?: boolean;
		optional?: boolean;
		/** Helper text below the control; hidden while an error is shown. */
		hint?: string;
		error?: string | null;
		class?: string;
		children: Snippet;
	}

	let {
		label,
		for: forId,
		required = false,
		optional = false,
		hint,
		error = null,
		class: className = '',
		children
	}: Props = $props();
</script>

<div class="form-control {className}">
	<label for={forId} class="mb-1.5 flex items-center justify-between gap-2">
		<span class="text-sm font-medium">{label}</span>
		{#if required}
			<span class="badge badge-ghost badge-sm text-error">Required</span>
		{:else if optional}
			<span class="badge badge-ghost badge-sm text-base-content/60">Optional</span>
		{/if}
	</label>

	{@render children()}

	{#if error}
		<span class="mt-1 flex items-center gap-1 text-xs text-error">
			<IconAlert class="size-3.5 shrink-0" />
			{error}
		</span>
	{:else if hint}
		<span class="mt-1 text-xs text-base-content/60">{hint}</span>
	{/if}
</div>
