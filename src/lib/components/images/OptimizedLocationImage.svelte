<!-- Photo of a place or offer; same behaviour as OptimizedImage, cover-fitted. -->
<script lang="ts">
	import OptimizedImage from './OptimizedImage.svelte';

	interface Props {
		src: string | null | undefined;
		alt: string;
		priority?: boolean;
		class?: string;
	}

	let { src, alt, priority = false, class: className = '' }: Props = $props();
</script>

<OptimizedImage {src} {alt} {priority} class={className} />
