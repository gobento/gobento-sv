<!-- Square business logo in a fixed box, with a shop glyph when there is no image. -->
<script lang="ts">
	import IconStore from '~icons/fluent/building-shop-24-regular';

	interface Props {
		src: string | null | undefined;
		size?: 'md' | 'lg';
		priority?: boolean;
	}

	let { src, size = 'md', priority = false }: Props = $props();

	let failed = $state(false);
</script>

<div
	class="flex shrink-0 items-center justify-center overflow-hidden border border-base-300/70 bg-base-200 text-base-content/40 {size ===
	'lg'
		? 'size-14 rounded-2xl'
		: 'size-12 rounded-xl'}"
>
	{#if src && !failed}
		<img
			{src}
			alt=""
			width="56"
			height="56"
			loading={priority ? 'eager' : 'lazy'}
			decoding="async"
			class="size-full object-cover"
			onerror={() => (failed = true)}
		/>
	{:else}
		<IconStore class="size-6" />
	{/if}
</div>
