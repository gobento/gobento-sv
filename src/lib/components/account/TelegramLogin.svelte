<!-- Official Telegram Login Widget in redirect mode: Telegram sends the signed user data to `authUrl`. -->
<script lang="ts">
	interface Props {
		bot: string;
		/** Same-origin path; made absolute here because Telegram needs a full URL. */
		authUrl: string;
		size?: 'large' | 'medium' | 'small';
	}

	let { bot, authUrl, size = 'large' }: Props = $props();
	let container = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!container) return;
		const script = document.createElement('script');
		script.async = true;
		script.src = 'https://telegram.org/js/telegram-widget.js?22';
		script.dataset.telegramLogin = bot;
		script.dataset.size = size;
		script.dataset.radius = '16';
		script.dataset.authUrl = new URL(authUrl, location.origin).href;
		container.replaceChildren(script);
		return () => container?.replaceChildren();
	});
</script>

<div bind:this={container} class="flex min-h-10 justify-center"></div>
