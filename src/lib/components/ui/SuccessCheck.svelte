<!-- src/lib/components/ui/SuccessCheck.svelte -->
<!-- A badge that pops in and draws its own tick: the "it worked" moment. -->
<script lang="ts">
	interface Props {
		size?: 'md' | 'lg';
		class?: string;
	}

	let { size = 'lg', class: className = '' }: Props = $props();
</script>

<div
	class="flex shrink-0 animate-burst items-center justify-center rounded-full bg-success text-success-content shadow-[0_8px_24px_color-mix(in_oklab,var(--color-success)_35%,transparent)] {size ===
	'lg'
		? 'size-20'
		: 'size-12'} {className}"
	aria-hidden="true"
>
	<svg viewBox="0 0 24 24" fill="none" class="check-draw {size === 'lg' ? 'size-10' : 'size-6'}">
		<path
			d="M5 12.5l4.5 4.5L19 7.5"
			stroke="currentColor"
			stroke-width="2.6"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</div>
