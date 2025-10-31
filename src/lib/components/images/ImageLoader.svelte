<!-- src/lib/components/ImageLoader.svelte -->
<script lang="ts">
	interface Props {
		src: string;
		alt: string;
		class?: string;
		sizes?: string;
		loading?: 'lazy' | 'eager';
		priority?: boolean;
		objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
	}

	let {
		src,
		alt,
		class: className = '',
		sizes = '100vw',
		loading = 'lazy',
		priority = false,
		objectFit = 'cover'
	}: Props = $props();

	let imageLoaded = $state(false);
	let imageError = $state(false);
	let cachedUrl = $state<string | null>(null);

	// Check cache first
	$effect(() => {
		checkCache();
	});

	async function checkCache() {
		if (!src) return;

		try {
			const cache = await caches.open('image-cache-v1');
			const cached = await cache.match(src);

			if (cached) {
				const blob = await cached.blob();
				cachedUrl = URL.createObjectURL(blob);
				imageLoaded = true;
			}
		} catch (error) {
			console.error('Cache check failed:', error);
		}
	}

	async function handleLoad(event: Event) {
		imageLoaded = true;

		// Cache the image for future use
		try {
			const cache = await caches.open('image-cache-v1');
			const response = await fetch(src);
			if (response.ok) {
				await cache.put(src, response.clone());
			}
		} catch (error) {
			console.error('Failed to cache image:', error);
		}
	}

	function handleError() {
		imageError = true;
		imageLoaded = true;
	}

	const objectFitClass =
		objectFit === 'cover'
			? 'object-cover'
			: objectFit === 'contain'
				? 'object-contain'
				: objectFit === 'fill'
					? 'object-fill'
					: objectFit === 'none'
						? 'object-none'
						: 'object-scale-down';
</script>

<div class="relative overflow-hidden {className}">
	{#if !imageLoaded && !imageError}
		<!-- Blur placeholder while loading -->
		<div class="absolute inset-0 animate-pulse bg-linear-to-br from-base-300 to-base-200">
			<div class="absolute inset-0 bg-base-content/5 backdrop-blur-xl"></div>
		</div>
	{/if}

	{#if imageError}
		<!-- Error state -->
		<div
			class="flex h-full w-full items-center justify-center bg-linear-to-br from-base-300 to-base-200"
		>
			<svg
				class="h-12 w-12 text-base-content/30"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
		</div>
	{:else}
		<img
			src={cachedUrl || src}
			{alt}
			{sizes}
			loading={priority ? 'eager' : loading}
			fetchpriority={priority ? 'high' : 'auto'}
			decoding={priority ? 'sync' : 'async'}
			class="h-full w-full transition-opacity duration-300 {objectFitClass} {imageLoaded
				? 'opacity-100'
				: 'opacity-0'}"
			onload={handleLoad}
			onerror={handleError}
		/>
	{/if}
</div>
