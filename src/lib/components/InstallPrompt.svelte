<!--
	Invites the visitor to install GoBento as an app. Chrome, Edge and Android
	get the native install dialog; iOS has none, so it shows the Share →
	"Add to Home Screen" steps instead. Hidden once installed, and for two
	weeks after being dismissed.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import IconDownload from '~icons/fluent/arrow-download-24-filled';
	import IconShare from '~icons/fluent/share-ios-24-regular';
	import IconAddSquare from '~icons/fluent/add-square-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';

	interface InstallPromptEvent extends Event {
		prompt(): Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	type InstallWindow = Window & { __installPrompt?: InstallPromptEvent };

	const DISMISS_KEY = 'installPromptDismissedAt';
	const DISMISS_FOR = 14 * 24 * 60 * 60 * 1000;
	const SHOW_AFTER = 4000;

	let installEvent = $state<InstallPromptEvent | null>(null);
	let ios = $state(false);
	let visible = $state(false);

	function isInstalled(): boolean {
		return (
			window.matchMedia('(display-mode: standalone)').matches ||
			window.matchMedia('(display-mode: fullscreen)').matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true
		);
	}

	function recentlyDismissed(): boolean {
		try {
			const at = Number(localStorage.getItem(DISMISS_KEY));
			return at > 0 && Date.now() - at < DISMISS_FOR;
		} catch {
			return false;
		}
	}

	function dismiss() {
		visible = false;
		try {
			localStorage.setItem(DISMISS_KEY, String(Date.now()));
		} catch {
			// Private mode: the card just comes back next visit.
		}
	}

	async function install() {
		if (!installEvent) return;
		await installEvent.prompt();
		const { outcome } = await installEvent.userChoice;
		// The event can only be used once.
		installEvent = null;
		(window as InstallWindow).__installPrompt = undefined;
		if (outcome === 'accepted') visible = false;
		else dismiss();
	}

	onMount(() => {
		if (isInstalled() || recentlyDismissed()) return;

		const win = window as InstallWindow;
		const pickUp = () => (installEvent = win.__installPrompt ?? null);
		pickUp();
		addEventListener('installpromptready', pickUp);

		const installed = () => (visible = false);
		addEventListener('appinstalled', installed);

		ios =
			/iphone|ipad|ipod/i.test(navigator.userAgent) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

		const timer = setTimeout(() => (visible = true), SHOW_AFTER);

		return () => {
			clearTimeout(timer);
			removeEventListener('installpromptready', pickUp);
			removeEventListener('appinstalled', installed);
		};
	});
</script>

{#if visible && (installEvent || ios)}
	<!-- Above the tab bar on phones, bottom-left on desktop (toasts use the right). -->
	<div
		class="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[2000] mx-auto max-w-sm md:start-64 md:end-auto md:bottom-6 md:mx-0"
		role="dialog"
		aria-labelledby="install-title"
		transition:fly={{ y: 24, duration: 280 }}
	>
		<div
			class="flex items-start gap-3 rounded-2xl border border-base-300/70 bg-base-100 p-4 shadow-lift"
		>
			<img src="/icon-192.png" alt="" class="size-11 shrink-0 rounded-xl" />
			<div class="min-w-0 flex-1">
				<p id="install-title" class="font-bold">Get the GoBento app</p>
				{#if installEvent}
					<p class="mt-0.5 text-sm text-base-content/70">
						Install it to open GoBento like an app, right from your home screen.
					</p>
					<button type="button" class="btn mt-3 btn-sm btn-primary" onclick={install}>
						<IconDownload class="size-4" />
						Install
					</button>
				{:else}
					<p class="mt-0.5 text-sm text-base-content/70">
						Tap
						<IconShare class="inline size-4 align-text-bottom" aria-label="Share" />
						then
						<span class="font-semibold whitespace-nowrap">
							<IconAddSquare class="inline size-4 align-text-bottom" />
							Add to Home Screen</span
						>.
					</p>
				{/if}
			</div>
			<button
				type="button"
				class="btn -me-1 -mt-1 btn-circle btn-ghost btn-sm"
				aria-label="Not now"
				onclick={dismiss}
			>
				<IconDismiss class="size-5" />
			</button>
		</div>
	</div>
{/if}
