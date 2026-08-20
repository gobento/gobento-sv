<!-- src/lib/components/ui/IconTile.svelte -->
<script lang="ts">
	import type { Component } from 'svelte';
	import { cx, TONE_SOFT, TONE_SOLID, type Tone } from './tokens';

	interface Props {
		icon: Component;
		tone?: Tone;
		/** `soft` is the tinted default; `solid` is for emphasis only. */
		variant?: 'soft' | 'solid';
		size?: 'sm' | 'md' | 'lg' | 'xl';
		class?: string;
	}

	let { icon, tone = 'primary', variant = 'soft', size = 'md', class: className = '' }: Props =
		$props();

	const BOX: Record<NonNullable<Props['size']>, string> = {
		sm: 'size-8 rounded-lg',
		md: 'size-10 rounded-xl',
		lg: 'size-12 rounded-xl',
		xl: 'size-20 rounded-2xl'
	};

	const GLYPH: Record<NonNullable<Props['size']>, string> = {
		sm: 'size-4',
		md: 'size-5',
		lg: 'size-6',
		xl: 'size-10'
	};

	const Icon = $derived(icon);
	const surface = $derived(variant === 'solid' ? TONE_SOLID[tone] : TONE_SOFT[tone]);
</script>

<div
	class={cx('flex shrink-0 items-center justify-center', BOX[size], surface, className)}
	aria-hidden="true"
>
	<Icon class={GLYPH[size]} />
</div>
