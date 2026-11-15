<!-- Pickup sheet: shows the pickup code to staff and confirms the hand-over with a slide. -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconArrowRight from '~icons/fluent/arrow-right-24-filled';
	import IconCheck from '~icons/fluent/checkmark-24-filled';
	import Modal from '#lib/components/Modal.svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';

	interface Props {
		open: boolean;
		claimToken: string;
		offerName: string;
		businessName: string;
		oncollected: () => void;
	}

	let { open = $bindable(false), claimToken, offerName, businessName, oncollected }: Props = $props();

	const THUMB = 56;
	const CONFIRM_AT = 0.9;

	let formEl = $state<HTMLFormElement | null>(null);
	let track = $state<HTMLElement | null>(null);
	let progress = $state(0);
	let dragging = $state(false);
	let submitting = $state(false);
	let errorMessage = $state('');
	let startX = 0;
	let travel = 1;

	function vibrate(pattern: number | number[]) {
		navigator.vibrate?.(pattern);
	}

	function confirm() {
		if (submitting) return;
		progress = 1;
		vibrate([30, 10, 30]);
		formEl?.requestSubmit();
	}

	function onPointerDown(event: PointerEvent) {
		if (submitting || !track) return;
		dragging = true;
		startX = event.clientX;
		travel = Math.max(1, track.clientWidth - THUMB - 8);
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		const direction = getComputedStyle(track!).direction === 'rtl' ? -1 : 1;
		const next = Math.min(1, Math.max(0, ((event.clientX - startX) * direction) / travel));
		if (next >= CONFIRM_AT && progress < CONFIRM_AT) vibrate(15);
		progress = next;
	}

	function onPointerUp() {
		if (!dragging) return;
		dragging = false;
		if (progress >= CONFIRM_AT) confirm();
		else progress = 0;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			confirm();
		}
	}

	$effect(() => {
		if (!open) {
			progress = 0;
			dragging = false;
			errorMessage = '';
		}
	});
</script>

<Modal bind:open title="Collect your food" position="bottom" size="small" dismissible={!submitting}>
	<div class="space-y-5">
		<p class="text-sm text-base-content/70">
			Show this screen to the staff at <strong class="text-base-content">{businessName}</strong>,
			then slide to confirm once you have your bag.
		</p>

		<div class="rounded-2xl border border-dashed border-base-300 bg-base-200/60 p-4 text-center">
			<p class="eyebrow">Pickup code</p>
			<p class="mt-1.5 font-mono text-sm font-bold break-all select-all" dir="ltr">{claimToken}</p>
			<p class="mt-2 truncate text-sm text-base-content/60">{offerName}</p>
		</div>

		{#if errorMessage}
			<Alert type="error">{errorMessage}</Alert>
		{/if}

		<form
			bind:this={formEl}
			method="POST"
			action="?/claimReservation"
			use:enhance={() => {
				submitting = true;
				errorMessage = '';
				return async ({ result, update }) => {
					if (result.type === 'success') {
						await update({ reset: false });
						submitting = false;
						open = false;
						oncollected();
						return;
					}
					submitting = false;
					progress = 0;
					errorMessage =
						result.type === 'failure' && typeof result.data?.error === 'string'
							? result.data.error
							: 'Something went wrong. Please try again.';
					// A failure usually means the status changed elsewhere; refresh what is shown.
					if (result.type === 'failure') await update({ reset: false });
				};
			}}
		>
			<div
				bind:this={track}
				class="relative h-16 overflow-hidden rounded-full bg-success/15 select-none"
			>
				<div
					class="absolute inset-y-0 start-0 rounded-full bg-success/30 {dragging
						? ''
						: 'transition-[width] duration-300 ease-out-quint'}"
					style:width="calc({THUMB + 8}px + (100% - {THUMB + 8}px) * {progress})"
				></div>

				<p
					class="pointer-events-none absolute inset-0 flex items-center justify-center ps-12 text-sm font-extrabold text-success"
					style:opacity={submitting ? 1 : Math.max(0, 1 - progress * 2.5)}
				>
					{submitting ? 'Confirming…' : 'Slide to confirm pickup'}
				</p>

				<button
					type="button"
					class="absolute start-1 top-1 flex size-14 cursor-grab touch-none items-center justify-center rounded-full bg-success text-success-content shadow-soft active:cursor-grabbing {dragging
						? ''
						: 'transition-[inset-inline-start] duration-300 ease-out-quint'}"
					style:inset-inline-start="calc(0.25rem + (100% - {THUMB + 8}px) * {progress})"
					aria-label="Confirm pickup. Slide to the end, or press Enter."
					disabled={submitting}
					onpointerdown={onPointerDown}
					onpointermove={onPointerMove}
					onpointerup={onPointerUp}
					onpointercancel={onPointerUp}
					onkeydown={onKeydown}
				>
					{#if submitting}
						<Spinner size="sm" />
					{:else if progress >= CONFIRM_AT}
						<IconCheck class="size-6" />
					{:else}
						<IconArrowRight class="size-6 rtl:rotate-180" />
					{/if}
				</button>
			</div>
		</form>

		<p class="text-center text-xs text-base-content/55">
			Only confirm when the bag is in your hands. This cannot be undone.
		</p>
	</div>
</Modal>
