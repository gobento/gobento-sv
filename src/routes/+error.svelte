<script lang="ts">
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

	const contactUrl = $derived(
		errorId ? `/contact?errorId=${encodeURIComponent(errorId)}` : '/contact'
	);

	function goBack() {
		history.back();
	}

	function retry() {
		location.reload();
	}
</script>

<svelte:head>
	<title>{config.title} · GoBento</title>
</svelte:head>

<div class="flex min-h-[85dvh] items-center justify-center px-4 py-10">
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
		<p class="stagger mt-2 animate-rise-in text-base-content/70" style:--i={1}>
			{config.message}
		</p>

		{#if errorId}
			<div class="stagger mt-6 animate-rise-in text-start" style:--i={2}>
				<p class="eyebrow mb-1.5 px-1">Error reference</p>
				<CopyField value={errorId} label="Error reference" />
				<p class="mt-1.5 px-1 text-xs text-base-content/55">
					Share this code with support so we can find what went wrong.
				</p>
			</div>
		{/if}

		<div class="stagger mt-7 flex animate-rise-in flex-col gap-2.5" style:--i={3}>
			{#if config.retry}
				<Button icon={IconRetry} block onclick={retry}>Try again</Button>
				<Button href="/" variant="ghost" icon={IconHome} block>Go to start</Button>
			{:else}
				<Button href="/" icon={IconHome} block>Go to start</Button>
				<Button variant="ghost" icon={IconBack} block onclick={goBack}>Go back</Button>
			{/if}
			{#if config.support || errorId}
				<Button href={contactUrl} variant="ghost" icon={IconMail} block>Contact support</Button>
			{/if}
		</div>
	</div>
</div>
