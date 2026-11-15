<!-- src/lib/components/ui/Toaster.svelte -->
<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import IconSuccess from '~icons/fluent/checkmark-circle-24-filled';
	import IconError from '~icons/fluent/error-circle-24-filled';
	import IconInfo from '~icons/fluent/info-24-filled';
	import { toast, type ToastKind } from './toast.svelte';

	const ICON = { success: IconSuccess, error: IconError, info: IconInfo };
	const TONE: Record<ToastKind, string> = {
		success: 'text-success',
		error: 'text-error',
		info: 'text-info'
	};
</script>

<!-- Sits above the tab bar on phones, bottom-right on desktop. -->
<div
	class="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[2100] flex flex-col items-center gap-2 px-4 md:inset-x-auto md:end-6 md:bottom-6 md:items-end"
	role="region"
	aria-label="Notifications"
>
	{#each toast.items as item (item.id)}
		{@const Icon = ICON[item.kind]}
		<button
			type="button"
			class="pointer-events-auto flex max-w-sm animate-toast-in items-center gap-3 rounded-2xl border border-base-300/70 bg-base-100 py-3 ps-3.5 pe-4 text-start text-sm font-semibold shadow-lift"
			role={item.kind === 'error' ? 'alert' : 'status'}
			onclick={() => toast.dismiss(item.id)}
			animate:flip={{ duration: 220 }}
			out:fade={{ duration: 160 }}
		>
			<Icon class="size-5 shrink-0 {TONE[item.kind]}" />
			<span>{item.message}</span>
		</button>
	{/each}
</div>
