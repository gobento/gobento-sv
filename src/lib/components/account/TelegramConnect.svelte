<!-- Profile card: connect Telegram as a sign-in method, or disconnect it. -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import TelegramLogin from './TelegramLogin.svelte';
	import IconSend from '~icons/fluent/send-24-regular';

	interface Props {
		telegram: { bot: string; connected: boolean; linkUrl: string; canDisconnect: boolean };
	}

	let { telegram }: Props = $props();

	const MESSAGES: Record<string, { text: string; ok: boolean }> = {
		connected: { text: 'Telegram connected. You can now sign in with it.', ok: true },
		taken: { text: 'That Telegram account is already connected to another GoBento account.', ok: false },
		failed: { text: 'Connecting Telegram did not work. Please try again.', ok: false }
	};
	const status = $derived(MESSAGES[page.url.searchParams.get('telegram') ?? '']);
	const formError = $derived(
		(page.form as { telegram?: { error?: string } } | null)?.telegram?.error
	);
</script>

<section class="space-y-3 rounded-2xl border border-base-300 bg-base-100 p-4">
	<div class="flex items-center gap-4">
		<div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
			<IconSend class="size-5" />
		</div>
		<div class="min-w-0 flex-1">
			<p class="text-xs font-medium tracking-wide text-base-content/50 uppercase">Telegram</p>
			<p class="font-semibold">{telegram.connected ? 'Connected' : 'Sign in with Telegram'}</p>
		</div>
		{#if telegram.connected && telegram.canDisconnect}
			<form method="POST" action="?/disconnectTelegram" use:enhance>
				<button class="btn btn-ghost btn-sm">Disconnect</button>
			</form>
		{/if}
	</div>

	{#if !telegram.connected}
		<TelegramLogin bot={telegram.bot} authUrl={telegram.linkUrl} size="medium" />
	{/if}

	{#if status}
		<p class="text-sm {status.ok ? 'text-success' : 'text-error'}">{status.text}</p>
	{:else if formError}
		<p class="text-sm text-error">{formError}</p>
	{/if}
</section>
