<!-- /src/lib/components/CollectFoodModal.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import IconQrCode from '~icons/fluent/qr-code-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-filled';
	import IconDismiss from '~icons/fluent/dismiss-circle-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';
	import Modal from '$lib/components/Modal.svelte';

	let {
		open = $bindable(false),
		claimToken,
		form = null,
		onCollectComplete = null
	}: {
		open: boolean;
		claimToken: string;
		form?: any;
		onCollectComplete?: (() => void) | null;
	} = $props();

	let swipeProgress = $state(0);
	let isDragging = $state(false);
	let startX = $state(0);
	let collectLoading = $state(false);

	function handleSwipeStart(e: MouseEvent | TouchEvent) {
		isDragging = true;
		startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
	}

	function handleSwipeEnd() {
		if (swipeProgress >= 90) {
			handleCollect();
		} else {
			swipeProgress = 0;
		}
		isDragging = false;
	}

	function handleSwipeMove(e: MouseEvent | TouchEvent) {
		if (!isDragging) return;

		const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const diff = currentX - startX;
		const maxWidth = 300;
		const progress = Math.max(0, Math.min(100, (diff / maxWidth) * 100));

		if (progress >= 90 && swipeProgress < 90) {
			hapticFeedback('heavy');
		} else if (progress >= 50 && swipeProgress < 50) {
			hapticFeedback('light');
		}

		swipeProgress = progress;
	}

	async function handleCollect() {
		collectLoading = true;
		const formEl = document.getElementById('collectForm') as HTMLFormElement;
		if (formEl) {
			formEl.requestSubmit();
		}
	}

	function hapticFeedback(intensity: 'light' | 'medium' | 'heavy' = 'medium') {
		if (!browser) return;
		if ('vibrate' in navigator) {
			const patterns = {
				light: 10,
				medium: 20,
				heavy: [30, 10, 30]
			};
			navigator.vibrate(patterns[intensity]);
		}
	}

	$effect(() => {
		if (form?.success && !collectLoading) {
			open = false;
			swipeProgress = 0;
			if (onCollectComplete) {
				onCollectComplete();
			}
		}
		if (!form?.success && collectLoading) {
			collectLoading = false;
		}
	});
</script>

<svelte:window
	onmousemove={handleSwipeMove}
	onmouseup={handleSwipeEnd}
	ontouchmove={handleSwipeMove}
	ontouchend={handleSwipeEnd}
/>

<Modal bind:open size="small" title="Collect Your Food">
	{#if form?.error && collectLoading === false}
		<div class="mb-4 rounded-xl border-l-4 border-error bg-error/10 p-4">
			<div class="flex items-center gap-2 text-error">
				<IconDismiss class="size-5" />
				<span>{form.error}</span>
			</div>
		</div>
	{/if}

	<!-- QR Code Display -->
	<div class="mb-6 flex flex-col items-center">
		<div class="rounded-2xl bg-white p-8 shadow-inner">
			<IconQrCode class="h-32 w-32 text-gray-800" />
		</div>
		<div class="mt-4 w-full rounded-xl bg-base-200 p-4">
			<p class="mb-2 text-center text-xs tracking-wide text-base-content/40 uppercase">
				Collection Token
			</p>
			<p class="text-center font-mono text-sm font-medium break-all">
				{claimToken}
			</p>
		</div>
	</div>

	<div class="divider my-6 text-xs tracking-wide uppercase">or</div>

	<!-- Swipe to Collect -->
	<div class="mb-6">
		<p class="mb-4 text-center text-sm text-base-content/60">
			Swipe right to confirm you've received your food
		</p>
		<div class="relative h-16 w-full overflow-hidden rounded-full bg-base-200">
			<!-- Progress fill as one rounded rectangle -->
			<div
				class="absolute top-2 bottom-2 left-2 flex items-center justify-end rounded-full bg-success pr-1 transition-all duration-100"
				style="width: calc(max(3rem, {swipeProgress}% - 0.5rem))"
			>
				<!-- Checkmark inside the filled area -->
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-content/20"
				>
					<IconCheckmark class="h-6 w-6" />
				</div>
			</div>

			<!-- Invisible drag handle that covers the entire bar -->
			<button
				type="button"
				class="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
				onmousedown={handleSwipeStart}
				ontouchstart={handleSwipeStart}
			>
				<span class="sr-only">Swipe to collect</span>
			</button>

			<!-- Text hint -->
			<div
				class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium"
				style="opacity: {Math.max(0, 1 - swipeProgress / 40)}"
			>
				Swipe to collect →
			</div>
		</div>
	</div>

	<form
		id="collectForm"
		method="POST"
		action="?/claimReservation"
		use:enhance={() => {
			collectLoading = true;
			return async ({ update }) => {
				await update();
				collectLoading = false;
			};
		}}
	></form>

	{#if collectLoading}
		<div class="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary/10 p-4">
			<span class="loading loading-md loading-spinner text-primary"></span>
			<span class="text-sm font-medium text-primary">Processing collection...</span>
		</div>
	{/if}
</Modal>
