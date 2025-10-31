// src/lib/utils/imagePreloader.svelte.ts

import { SvelteSet } from 'svelte/reactivity';

/**
 * Simplified image preloader for SvelteKit 5 with Runes
 * Uses native browser caching instead of Cache API for better performance
 */

/**
 * Preload images using native browser cache
 * Faster and simpler than Cache API
 */
export function preloadImages(urls: string[]) {
	if (!urls.length || typeof window === 'undefined') return;

	const preload = () => {
		urls.forEach((url) => {
			// Use Image object for preloading - browser handles caching automatically
			const img = new Image();
			img.loading = 'lazy';
			img.decoding = 'async';
			img.src = url;
		});
	};

	// Use requestIdleCallback for non-blocking preload
	if ('requestIdleCallback' in window) {
		requestIdleCallback(preload, { timeout: 2000 });
	} else {
		setTimeout(preload, 100);
	}
}

/**
 * Extract image URLs from data structures
 * Simplified with better type safety
 */
export function extractImageUrls(data: unknown): string[] {
	const urls = new SvelteSet<string>(); // Use Set to avoid duplicates

	function traverse(obj: unknown) {
		if (!obj || typeof obj !== 'object') return;

		if (Array.isArray(obj)) {
			obj.forEach(traverse);
			return;
		}

		// Extract from common patterns
		const record = obj as Record<string, unknown>;

		// Direct URL properties
		if (typeof record.url === 'string') urls.add(record.url);
		if (typeof record.imageUrl === 'string') urls.add(record.imageUrl);

		// Nested logo URLs
		const logo = record.logo as Record<string, unknown> | undefined;
		if (logo?.url && typeof logo.url === 'string') urls.add(logo.url);

		// Business logo URLs
		const business = record.business as Record<string, unknown> | undefined;
		const businessLogo = business?.logo as Record<string, unknown> | undefined;
		if (businessLogo?.url && typeof businessLogo.url === 'string') {
			urls.add(businessLogo.url);
		}
	}

	traverse(data);
	return Array.from(urls);
}

/**
 * Svelte 5 Rune hook for image preloading
 * Usage: useImagePreloader(() => extractImageUrls(data));
 */
export function useImagePreloader(getUrls: () => string[]) {
	$effect(() => {
		preloadImages(getUrls());
	});
}
