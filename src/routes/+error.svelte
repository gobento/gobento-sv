<!-- src/routes/+error.svelte -->
<script lang="ts">
	import FluentEmojiCrossMark from '~icons/fluent-emoji/cross-mark';
	import FluentEmojiFaceWithRaisedEyebrow from '~icons/fluent-emoji/face-with-raised-eyebrow';
	import FluentEmojiWarning from '~icons/fluent-emoji/warning';
	import FluentEmojiSos from '~icons/fluent-emoji/sos-button';
	import FluentArrowLeft24Regular from '~icons/fluent/arrow-left-24-regular';
	import FluentHome24Regular from '~icons/fluent/home-24-regular';
	import FluentMail24Regular from '~icons/fluent/mail-24-regular';
	import { page } from '$app/state';

	const { status, error } = $derived(page);
	const errorId = $derived(error?.errorId);

	const config = $derived.by(() => {
		if (status === 404)
			return {
				icon: FluentEmojiFaceWithRaisedEyebrow,
				title: 'Page Not Found',
				message: "This page doesn't exist or has been moved."
			};
		if (status === 400)
			return {
				icon: FluentEmojiWarning,
				title: 'Bad Request',
				message: 'Please check your input and try again.'
			};
		if (status >= 500)
			return {
				icon: FluentEmojiSos,
				title: 'Server Error',
				message: error?.message || 'Something went wrong on our end.',
				showSupport: true
			};
		return {
			icon: FluentEmojiCrossMark,
			title: 'Error',
			message: error?.message || 'An unexpected error occurred.'
		};
	});

	const contactUrl = $derived(
		errorId ? `/contact?errorId=${encodeURIComponent(errorId)}` : '/contact'
	);
</script>

<svelte:head>
	<title>{config.title} - Error {status}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-4 py-16">
	<div class="w-full max-w-md">
		<!-- Icon -->
		<div class="mb-8 flex justify-center">
			<div class="flex size-24 items-center justify-center rounded-full bg-base-200">
				<svelte:component this={config.icon} class="size-16" />
			</div>
		</div>

		<!-- Status & Message -->
		<div class="mb-6 text-center">
			<p class="mb-2 text-6xl font-bold text-base-content/20">{status}</p>
			<h1 class="mb-3 text-2xl font-semibold text-base-content">{config.title}</h1>
			<p class="text-base-content/70">{config.message}</p>
		</div>

		<!-- Support Call-to-Action -->
		{#if config.showSupport}
			<div class="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-5">
				<div class="mb-3 text-center">
					<p class="mb-1 text-base font-semibold text-base-content">Need assistance?</p>
					<p class="text-sm text-base-content/70">
						Our support team is ready to help you resolve this issue
					</p>
				</div>
				<a href={contactUrl} class="btn w-full gap-2 btn-primary">
					<FluentMail24Regular class="size-5" />
					<span>Contact Support</span>
				</a>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex flex-col gap-3">
			<a href="/" class="btn gap-2 btn-primary">
				<FluentHome24Regular class="size-5" />
				<span>Go Home</span>
			</a>

			<button onclick={() => window.history.back()} class="btn gap-2 btn-ghost">
				<FluentArrowLeft24Regular class="size-5" />
				<span>Go Back</span>
			</button>
		</div>
	</div>
</div>
