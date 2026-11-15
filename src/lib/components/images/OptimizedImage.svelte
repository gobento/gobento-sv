<!-- Image that fills its (fixed-size) parent box, with a shimmer until loaded. -->
<script lang="ts">
	import IconImageOff from '~icons/fluent/image-off-24-regular';

	interface Props {
		src: string | null | undefined;
		alt: string;
		priority?: boolean;
		objectFit?: 'cover' | 'contain' | 'fill';
		class?: string;
	}

	let { src, alt, priority = false, objectFit = 'cover', class: className = '' }: Props = $props();

	let loaded = $state(false);
	let error = $state(false);

	const FIT = { cover: 'object-cover', contain: 'object-contain', fill: 'object-fill' };

	// A cached image can finish before hydration attaches `onload`.
	function settle(node: HTMLImageElement) {
		if (node.complete && node.naturalWidth > 0) loaded = true;
	}
</script>

<div class="relative overflow-hidden bg-base-200 {className}">
	{#if !src || error}
		<div class="absolute inset-0 flex items-center justify-center bg-primary/8 text-primary/35">
			<IconImageOff class="size-8" />
		</div>
	{:else}
		{#if !loaded}
			<div class="skeleton-shimmer absolute inset-0 rounded-none"></div>
		{/if}
		<img
			{src}
			{alt}
			loading={priority ? 'eager' : 'lazy'}
			fetchpriority={priority ? 'high' : 'auto'}
			decoding="async"
			class="{FIT[objectFit]} size-full transition-opacity duration-300 {loaded
				? 'opacity-100'
				: 'opacity-0'}"
			use:settle
			onload={() => (loaded = true)}
			onerror={() => (error = true)}
		/>
	{/if}
</div>
