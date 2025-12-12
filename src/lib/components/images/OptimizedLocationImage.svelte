<script lang="ts">
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconImageOff from '~icons/fluent/image-off-24-regular';

	interface Props {
		src: string; // fixme: might be cool to have a fallback if null
		alt: string;
		priority?: boolean;
		class?: string;
	}

	let { src, alt, priority = false, class: className = '' }: Props = $props();

	let loaded = $state(false);
	let error = $state(false);
</script>

<div class="relative {className}">
	{#if !loaded && !error}
		<div class="absolute inset-0 flex items-center justify-center bg-base-200">
			<IconLocation class="size-12 animate-pulse text-base-content/20" />
		</div>
	{/if}

	{#if error}
		<div
			class="absolute inset-0 flex items-center justify-center bg-linear-to-br from-primary/20 via-secondary/10 to-accent/10"
		>
			<IconImageOff class="size-20  text-error/40" />
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
