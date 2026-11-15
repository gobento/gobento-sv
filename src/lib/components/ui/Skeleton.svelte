<!-- src/lib/components/ui/Skeleton.svelte -->
<script lang="ts">
	interface Props {
		/** Tailwind size/shape classes, e.g. "h-4 w-32" or "aspect-video w-full". */
		class?: string;
	}

	let { class: className = 'h-4 w-full' }: Props = $props();
</script>

<div class="skeleton-shimmer {className}" aria-hidden="true"></div>
