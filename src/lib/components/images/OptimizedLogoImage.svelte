<!-- Square or round business logo in one of four fixed sizes. -->
<script lang="ts">
	import IconStore from '~icons/fluent/building-shop-24-regular';

	interface Props {
		src: string | null | undefined;
		alt: string;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		shape?: 'circle' | 'square';
		priority?: boolean;
		class?: string;
	}

	let {
		src,
		alt,
		size = 'md',
		shape = 'square',
		priority = false,
		class: className = ''
	}: Props = $props();

	let loaded = $state(false);
	let error = $state(false);

	const BOX = {
		xs: 'size-8',
		sm: 'size-12',
		md: 'size-16',
		lg: 'size-24',
		xl: 'size-32'
	};

	const GLYPH = {
		xs: 'size-4',
		sm: 'size-5',
		md: 'size-7',
		lg: 'size-10',
		xl: 'size-14'
	};

	const ROUNDING = {
		xs: 'rounded-lg',
		sm: 'rounded-xl',
		md: 'rounded-2xl',
		lg: 'rounded-3xl',
		xl: 'rounded-3xl'
	};

	function settle(node: HTMLImageElement) {
		if (node.complete && node.naturalWidth > 0) loaded = true;
	}
</script>

<div
	class="relative shrink-0 overflow-hidden border border-base-300/70 bg-base-100 shadow-soft {BOX[
		size
	]} {shape === 'circle' ? 'rounded-full' : ROUNDING[size]} {className}"
>
	{#if !src || error}
		<div class="absolute inset-0 flex items-center justify-center bg-primary/8 text-primary/50">
			<IconStore class={GLYPH[size]} />
		</div>
	{:else}
		{#if !loaded}
			<div class="skeleton-shimmer absolute inset-0 rounded-none"></div>
		{/if}
		<img
			{src}
			{alt}
			loading={priority ? 'eager' : 'lazy'}
			decoding="async"
			class="size-full object-cover transition-opacity duration-300 {loaded
				? 'opacity-100'
				: 'opacity-0'}"
			use:settle
			onload={() => (loaded = true)}
			onerror={() => (error = true)}
		/>
	{/if}
</div>
