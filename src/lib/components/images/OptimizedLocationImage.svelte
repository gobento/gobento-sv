<!-- /src/lib/components/images/OptimizedLocationImage.svelte -->
<script lang="ts">
	import IconStore from '~icons/fluent/building-retail-24-regular';
	import IconImageOff from '~icons/fluent/image-off-24-regular';

	interface Props {
		src: string;
		alt: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		shape?: 'circle' | 'square';
		priority?: boolean;
	}

	let { src, alt, size = 'md', shape = 'square', priority = false }: Props = $props();

	let loaded = $state(false);
	let error = $state(false);

	const sizeClasses = {
		sm: 'size-12',
		md: 'size-16',
		lg: 'size-24',
		xl: 'size-32'
	};

	const iconSizes = {
		sm: 'size-5',
		md: 'size-7',
		lg: 'size-10',
		xl: 'size-14'
	};

	const shapeClass = $derived(shape === 'circle' ? 'rounded-full' : 'rounded-lg');
	const containerClass = $derived(`${sizeClasses[size]} ${shapeClass}`);
	const iconClass = $derived(iconSizes[size]);
</script>

<div class="relative {containerClass} overflow-hidden bg-base-200 shadow-md">
	{#if !loaded && !error}
		<div class="absolute inset-0 flex items-center justify-center">
			<IconStore class="{iconClass} animate-pulse text-base-content/20" />
		</div>
	{/if}

	{#if error}
		<div class="absolute inset-0 flex items-center justify-center">
			<IconImageOff class="{iconClass} text-error/40" />
		</div>
	{:else}
		<img
			{src}
			{alt}
			loading={priority ? 'eager' : 'lazy'}
			decoding="async"
			class="h-full w-full object-cover transition-opacity duration-300 {loaded
				? 'opacity-100'
				: 'opacity-0'}"
			onload={() => (loaded = true)}
			onerror={() => (error = true)}
		/>
	{/if}
</div>
