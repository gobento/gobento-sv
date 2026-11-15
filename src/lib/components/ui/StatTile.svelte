<!-- src/lib/components/ui/StatTile.svelte -->
<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import AnimatedNumber from '../motion/AnimatedNumber.svelte';
	import IconTile from './IconTile.svelte';
	import type { Tone } from './tokens';

	interface Props {
		label: string;
		/** A number counts up on first view; a string is shown as is. */
		value: number | string;
		decimals?: number;
		prefix?: string;
		suffix?: string;
		icon?: Component;
		tone?: Tone;
		/** Small line under the value, e.g. "last 30 days". */
		hint?: string;
		href?: string;
		class?: string;
		children?: Snippet;
	}

	let {
		label,
		value,
		decimals = 0,
		prefix = '',
		suffix = '',
		icon,
		tone = 'primary',
		hint,
		href,
		class: className = '',
		children
	}: Props = $props();
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	class="surface flex min-w-0 flex-col gap-3 p-4 {href ? 'pressable' : ''} {className}"
>
	<div class="flex items-center justify-between gap-2">
		<span class="truncate text-sm font-semibold text-base-content/60">{label}</span>
		{#if icon}
			<IconTile {icon} {tone} size="sm" />
		{/if}
	</div>
	<div class="min-w-0">
		<p class="tabular truncate text-2xl leading-tight font-extrabold tracking-tight">
			{prefix}{#if typeof value === 'number'}<AnimatedNumber
					{value}
					{decimals}
				/>{:else}{value}{/if}{suffix}
		</p>
		{#if hint}
			<p class="mt-0.5 truncate text-xs text-base-content/50">{hint}</p>
		{/if}
	</div>
	{@render children?.()}
</svelte:element>
