<!-- src/lib/components/ui/StatusBadge.svelte -->
<script lang="ts">
	import { statusMeta, type StatusMeta } from '#lib/statuses.js';
	import { cx, TONE_BADGE } from './tokens';

	interface Props {
		/** One of the maps exported from `#lib/statuses.js`. */
		map: Record<string, StatusMeta>;
		status: string;
		size?: 'sm' | 'md' | 'lg';
		outline?: boolean;
		class?: string;
	}

	let { map, status, size = 'sm', outline = false, class: className = '' }: Props = $props();

	const SIZES = { sm: 'badge-sm', md: '', lg: 'badge-lg' };

	const meta = $derived(statusMeta(map, status));
	const Icon = $derived(meta.icon);
	const glyph = $derived(size === 'lg' ? 'size-4' : 'size-3');
</script>

<span
	class={cx(
		'badge gap-1',
		TONE_BADGE[meta.tone],
		SIZES[size],
		outline && 'badge-outline',
		className
	)}
>
	{#if Icon}
		<Icon class={glyph} />
	{/if}
	{meta.label}
</span>
