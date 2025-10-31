// src/lib/utils/imagePreload.ts

/**
 * Preload critical images and cache them
 */
export async function preloadImage(url: string): Promise<void> {
	try {
		const cache = await caches.open('image-cache-v1');

		// Check if already cached
		const cached = await cache.match(url);
		if (cached) {
			return;
		}

		// Fetch and cache
		const response = await fetch(url, {
			mode: 'cors',
			credentials: 'same-origin'
		});

		if (response.ok) {
			await cache.put(url, response);
		}
	} catch (error) {
		console.error('Failed to preload image:', url, error);
	}
}

/**
 * Preload multiple images in parallel
 */
export async function preloadImages(urls: string[]): Promise<void> {
	await Promise.allSettled(urls.map((url) => preloadImage(url)));
}

/**
 * Clear image cache (useful for development or user settings)
 */
export async function clearImageCache(): Promise<void> {
	try {
		await caches.delete('image-cache-v1');
	} catch (error) {
		console.error('Failed to clear image cache:', error);
	}
}

/**
 * Get cache size information
 */
export async function getCacheInfo(): Promise<{ count: number; size: number }> {
	try {
		const cache = await caches.open('image-cache-v1');
		const keys = await cache.keys();

		let totalSize = 0;
		for (const request of keys) {
			const response = await cache.match(request);
			if (response) {
				const blob = await response.blob();
				totalSize += blob.size;
			}
		}

		return {
			count: keys.length,
			size: totalSize
		};
	} catch (error) {
		console.error('Failed to get cache info:', error);
		return { count: 0, size: 0 };
	}
}
