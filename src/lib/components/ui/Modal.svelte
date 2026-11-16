<!-- src/lib/components/Modal.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { fade, fly, scale } from 'svelte/transition';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';

	interface Props {
		open: boolean;
		title?: string;
		onBack?: (() => void) | null;
		size?: 'default' | 'small' | 'large';
		/** `bottom` is a sheet on phones and a centred dialog from `sm` up. */
		position?: 'center' | 'bottom';
		/** Set false for flows that must be finished or explicitly cancelled. */
		dismissible?: boolean;
		onclose?: () => void;
		children: Snippet;
	}

	let {
		open = $bindable(false),
		title = '',
		onBack = null,
		size = 'default',
		position = 'center',
		dismissible = true,
		onclose,
		children
	}: Props = $props();

	const SIZES = { small: 'sm:max-w-sm', default: 'sm:max-w-lg', large: 'sm:max-w-2xl' };

	const titleId = $props.id();
	let panel = $state<HTMLElement | null>(null);

	function close() {
		open = false;
		onclose?.();
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && dismissible) {
			event.stopPropagation();
			close();
			return;
		}
		if (event.key !== 'Tab' || !panel) return;

		// Keep keyboard focus inside the dialog.
		const focusable = panel.querySelectorAll<HTMLElement>(
			'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
		);
		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	// While open: lock page scroll, move focus in, and restore it on close.
	$effect(() => {
		if (!open) return;
		const previous = document.activeElement as HTMLElement | null;
		const overflow = document.documentElement.style.overflow;
		document.documentElement.style.overflow = 'hidden';
		panel?.focus();
		return () => {
			document.documentElement.style.overflow = overflow;
			previous?.focus?.();
		};
	});

	// Render at the end of <body>. Inside the page, an ancestor with its own
	// stacking context (the route's view transition) kept the dialog below the
	// tab bar, which then covered the bottom of sheets.
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}

	// The sheet slides up on phones; everything else scales in.
	function enter(node: Element) {
		const sheet = position === 'bottom' && window.matchMedia('(max-width: 639px)').matches;
		return sheet
			? fly(node, { y: node.clientHeight || 400, duration: 340, easing: cubicOut, opacity: 1 })
			: scale(node, { start: 0.94, duration: 220, easing: cubicOut });
	}
</script>

{#if open}
	<div
		use:portal
		class="fixed inset-0 z-[1003] flex justify-center {position === 'bottom'
			? 'items-end sm:items-center'
			: 'items-center p-4'}"
	>
		<button
			type="button"
			class="absolute inset-0 cursor-default bg-neutral/50 backdrop-blur-[2px]"
			aria-label="Close dialog"
			tabindex="-1"
			onclick={() => dismissible && close()}
			transition:fade={{ duration: 180 }}
		></button>

		<div
			bind:this={panel}
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? titleId : undefined}
			tabindex="-1"
			onkeydown={onKeydown}
			in:enter
			out:fade={{ duration: 140 }}
			class="relative flex max-h-[92dvh] w-full flex-col bg-base-100 shadow-lift outline-none {SIZES[
				size
			]} {position === 'bottom'
				? 'rounded-t-[1.75rem] sm:m-4 sm:rounded-[1.75rem]'
				: 'rounded-[1.75rem]'}"
		>
			{#if position === 'bottom'}
				<div
					class="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-base-content/15 sm:hidden"
				></div>
			{/if}

			<div class="flex shrink-0 items-center justify-between gap-2 px-5 pt-4 pb-2">
				<div class="flex min-w-0 items-center gap-2">
					{#if onBack}
						<button onclick={onBack} class="btn btn-circle btn-ghost btn-sm" aria-label="Go back">
							<IconArrowLeft class="size-5 rtl:rotate-180" />
						</button>
					{/if}
					{#if title}
						<h2 id={titleId} class="truncate text-lg font-extrabold">{title}</h2>
					{/if}
				</div>
				{#if dismissible}
					<button onclick={close} class="btn btn-circle btn-ghost btn-sm" aria-label="Close">
						<IconDismiss class="size-5" />
					</button>
				{/if}
			</div>

			<div class="overflow-y-auto overscroll-contain px-5 pt-2 safe-bottom">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
