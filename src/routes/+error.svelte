<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import EmojiNotFound from '~icons/fluent-emoji-flat/face-with-monocle';
	import EmojiForbidden from '~icons/fluent-emoji-flat/locked';
	import EmojiBroken from '~icons/fluent-emoji-flat/cooking';
	import EmojiOffline from '~icons/fluent-emoji-flat/satellite-antenna';
	import EmojiGeneric from '~icons/fluent-emoji-flat/thinking-face';
	import IconBack from '~icons/fluent/arrow-left-24-regular';
	import IconHome from '~icons/fluent/home-24-regular';
	import IconMail from '~icons/fluent/mail-24-regular';
	import IconRetry from '~icons/fluent/arrow-clockwise-24-regular';
	import Button from '#lib/components/ui/Button.svelte';
	import { supportUrl } from '#lib/support.js';
	import CopyField from '#lib/components/account/CopyField.svelte';

	const status = $derived(page.status);
	const errorId = $derived(page.error?.errorId);
	const serverMessage = $derived(page.error?.message);

	const config = $derived.by(() => {
		if (status === 404)
			return {
				icon: EmojiNotFound,
				title: 'Nothing on this shelf',
				message: 'This page does not exist or has moved. Let us get you back to the good stuff.'
			};
		if (status === 401 || status === 403)
			return {
				icon: EmojiForbidden,
				title: 'This one is off limits',
				message: serverMessage || 'Your account does not have access to this page.'
			};
		if (status === 429)
			return {
				icon: EmojiOffline,
				title: 'Slow down a little',
				message: 'Too many requests in a short time. Wait a moment and try again.',
				retry: true
			};
		if (status >= 500)
			return {
				icon: EmojiBroken,
				title: 'Something burned in the kitchen',
				message: 'That is on us, not you. Try again in a moment, or tell us what happened.',
				retry: true,
				support: true
			};
		return {
			icon: EmojiGeneric,
			title: 'That did not work',
			message: serverMessage || 'Please check what you entered and try again.'
		};
	});

	const Icon = $derived(config.icon);

	// Straight into the Telegram support chat, hello and error reference prefilled.
	const contactUrl = $derived(supportUrl(errorId));

	// Opened straight from a link (chat, mail, bookmark) there is no page of
	// ours to go back to, and history.back() would do nothing or leave the app.
	function goBack() {
		const cameFromApp = document.referrer.startsWith(location.origin);
		if (cameFromApp && history.length > 1) history.back();
		else location.assign('/');
	}

	function retry() {
		location.reload();
	}
</script>

<svelte:head>
	<title>{config.title} · GoBento</title>
</svelte:head>

<!-- Rendered outside the app shell, so it owns the whole viewport. -->
<div
	class="flex min-h-dvh items-center justify-center px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]"
>
	<div class="w-full max-w-sm text-center">
		<div class="relative mx-auto mb-6 w-fit">
			<div
				class="flex size-28 animate-float items-center justify-center rounded-[2.25rem] bg-base-100 shadow-lift"
			>
				<Icon class="size-16" />
			</div>
			<span
				class="tabular absolute -end-5 -top-2 animate-pop-in rounded-full bg-secondary px-2.5 py-1 text-sm font-extrabold text-secondary-content shadow-soft"
			>
				{status}
			</span>
		</div>

		<h1 class="animate-rise-in text-2xl font-extrabold tracking-tight">{config.title}</h1>
		<p class="mt-2 animate-rise-in text-base-content/70 stagger" style:--i={1}>
			{config.message}
		</p>

		{#if errorId}
			<div class="mt-6 animate-rise-in text-start stagger" style:--i={2}>
				<p class="eyebrow mb-1.5 px-1">Error reference</p>
				<CopyField value={errorId} label="Error reference" />
			</div>
		{/if}

		<div class="mt-7 flex animate-rise-in flex-col gap-2.5 stagger" style:--i={3}>
			{#if config.retry}
				<Button icon={IconRetry} block onclick={retry}>Try again</Button>
				<Button href={resolve('/(dock)')} variant="ghost" icon={IconHome} block>Go to start</Button>
			{:else}
				<Button href={resolve('/(dock)')} icon={IconHome} block>Go to start</Button>
				<Button variant="ghost" icon={IconBack} block onclick={goBack}>Go back</Button>
			{/if}
			{#if config.support || errorId}
				<Button
					href={contactUrl}
					target="_blank"
					rel="noopener noreferrer"
					variant="ghost"
					icon={IconMail}
					block
				>
					Contact support
				</Button>
			{/if}
		</div>
	</div>
</div>
