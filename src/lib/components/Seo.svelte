<!-- Shared SEO + Open Graph / Twitter card metadata. Render once per page. -->
<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		title: string;
		description: string;
		/** Absolute or site-relative image URL; falls back to the branded default card. */
		image?: string;
		imageAlt?: string;
		type?: string;
	}

	let { title, description, image, imageAlt, type = 'website' }: Props = $props();

	// Crawlers need absolute URLs; the request's own origin is right on every
	// deployment (production, previews, localhost) without extra config.
	const canonical = $derived(page.url.origin + page.url.pathname);
	const ogImage = $derived(
		image ? new URL(image, page.url.origin).href : `${page.url.origin}/og.png`
	);
	const alt = $derived(imageAlt ?? title);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />

	<!-- Open Graph -->
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content="GoBento" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:alt" content={alt} />
	{#if !image}
		<meta property="og:image:type" content="image/png" />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
	{/if}
	<meta property="og:locale" content="en_US" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
	<meta name="twitter:image:alt" content={alt} />
</svelte:head>
