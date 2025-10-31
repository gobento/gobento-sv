<script lang="ts">
	import IconImage from '~icons/fluent/image-24-regular';
	import IconImageOff from '~icons/fluent/image-off-24-regular';

	interface Props {
		src: string;
		alt: string;
		priority?: boolean;
		objectFit?: 'cover' | 'contain' | 'fill';
		class?: string;
	}

	let { src, alt, priority = false, objectFit = 'cover', class: className = '' }: Props = $props();

	let loaded = $state(false);
	let error = $state(false);

	const objectFitClass = {
		cover: 'object-cover',
		contain: 'object-contain',
		fill: 'object-fill'
	}[objectFit];
</script>

<div class="relative {className}">
	{#if !loaded && !error}
		<div class="absolute inset-0 flex items-center justify-center bg-base-200">
			<IconImage class="size-8 animate-pulse text-base-content/20" />
		</div>
	{/if}

	{#if error}
		<div class="absolute inset-0 flex items-center justify-center bg-base-200">
			<IconImageOff class="size-8 text-error/40" />
		</div>
	{:else}
		<img
			{src}
			{alt}
			loading={priority ? 'eager' : 'lazy'}
			decoding="async"
			class="{objectFitClass} h-full w-full transition-opacity duration-300 {loaded
				? 'opacity-100'
				: 'opacity-0'}"
			onload={() => (loaded = true)}
			onerror={() => (error = true)}
		/>
	{/if}
</div>
