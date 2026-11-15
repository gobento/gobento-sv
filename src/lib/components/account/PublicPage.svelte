<!-- Shared frame for the signed-out pages (about, contact, legal). -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import BentoBox from '~icons/fluent-emoji-flat/bento-box';
	import IconBack from '~icons/fluent/chevron-left-24-regular';

	interface Props {
		title: string;
		description?: string;
		/** Small line above the title, e.g. "Legal". */
		eyebrow?: string;
		/** Long-form text: applies readable typography to plain HTML children. */
		prose?: boolean;
		children: Snippet;
	}

	let { title, description, eyebrow, prose = false, children }: Props = $props();

	// Return to wherever the visitor came from (profile, login, error page);
	// the href is the fallback for a fresh tab.
	function goBack(event: MouseEvent) {
		const sameOrigin = document.referrer.startsWith(location.origin);
		if (history.length > 1 && (sameOrigin || history.state)) {
			event.preventDefault();
			history.back();
		}
	}
</script>

<div class="flex min-h-[calc(100dvh-3rem)] flex-col sm:min-h-[calc(100dvh-4rem)]">
	<nav class="flex items-center justify-between gap-3" aria-label="Site">
		<a
			href="/"
			onclick={goBack}
			class="-ms-2 inline-flex min-h-11 items-center gap-0.5 rounded-full ps-1 pe-3 text-sm font-bold text-base-content/60 transition-colors hover:bg-base-300/50 hover:text-base-content"
		>
			<IconBack class="size-5 rtl:rotate-180" />
			Back
		</a>
		<a href="/" class="inline-flex min-h-11 items-center gap-2 font-extrabold tracking-tight">
			<BentoBox class="size-7" />
			GoBento
		</a>
	</nav>

	<header class="mt-6 mb-6 animate-rise-in">
		{#if eyebrow}
			<p class="eyebrow mb-1">{eyebrow}</p>
		{/if}
		<h1 class="text-3xl leading-tight font-extrabold tracking-tight">{title}</h1>
		{#if description}
			<p class="mt-2 text-base-content/70">{description}</p>
		{/if}
	</header>

	<main class="flex-1">
		{#if prose}
			<div class="legal-prose prose prose-sm max-w-none sm:prose-base">
				{@render children()}
			</div>
		{:else}
			{@render children()}
		{/if}
	</main>

	<footer
		class="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-base-300/70 pt-4 text-sm font-semibold text-base-content/60"
	>
		<a class="hover:text-base-content" href="/about">About</a>
		<a class="hover:text-base-content" href="/contact">Contact</a>
		<a class="hover:text-base-content" href="/terms-of-service">Terms</a>
		<a class="hover:text-base-content" href="/privacy-policy">Privacy</a>
	</footer>
</div>

<style>
	/* Map the typography plugin's palette onto the theme so it follows dark mode. */
	.legal-prose {
		--tw-prose-body: color-mix(in oklab, var(--color-base-content) 78%, transparent);
		--tw-prose-headings: var(--color-base-content);
		--tw-prose-bold: var(--color-base-content);
		--tw-prose-links: var(--color-primary);
		--tw-prose-bullets: color-mix(in oklab, var(--color-base-content) 35%, transparent);
		--tw-prose-counters: color-mix(in oklab, var(--color-base-content) 55%, transparent);
		--tw-prose-hr: var(--color-base-300);
		--tw-prose-quotes: var(--color-base-content);
		overflow-wrap: anywhere;
	}
</style>
