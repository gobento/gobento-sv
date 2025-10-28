<!-- src/routes/+error.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import FluentEmojiCrossMark from '~icons/fluent-emoji/cross-mark';
	import FluentEmojiFaceWithRaisedEyebrow from '~icons/fluent-emoji/face-with-raised-eyebrow';
	import FluentEmojiWarning from '~icons/fluent-emoji/warning';
	import FluentEmojiSos from '~icons/fluent-emoji/sos-button';
	import FluentArrowLeft24Regular from '~icons/fluent/arrow-left-24-regular';
	import { page } from '$app/state';

	const status = $derived(page.status);
	const errorMessage = $derived(page.error?.message || 'An unexpected error occurred');

	function goHome() {
		goto('/');
	}

	function goBack() {
		window.history.back();
	}

	// Determine which icon to show based on error type
	const ErrorIcon = $derived.by(() => {
		if (status === 404) return FluentEmojiFaceWithRaisedEyebrow;
		if (status === 400) return FluentEmojiWarning;
		if (status >= 500) return FluentEmojiSos;
		return FluentEmojiCrossMark;
	});

	// Determine error title
	const errorTitle = $derived.by(() => {
		if (status === 404) return 'Page Not Found';
		if (status === 400) return 'Bad Request';
		if (status >= 500) return 'Server Error';
		return 'Error';
	});

	// Determine helpful message
	const helpMessage = $derived.by(() => {
		if (status === 404)
			return "The page you're looking for doesn't exist. It might have been moved or deleted.";
		if (status === 400)
			return 'There was a problem with your request. Please check your input and try again.';
		if (status >= 500)
			return 'Something went wrong on our end. Please try again later or contact support if the problem persists.';
		return 'An unexpected error occurred. Please try again.';
	});
</script>

<svelte:head>
	<title>{errorTitle} - Error {status}</title>
	<meta name="description" content="Error {status}: {errorMessage}" />
</svelte:head>

<div
	class="container mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4"
>
	<!-- Error Card -->
	<div
		class="w-full rounded-2xl border border-white/30 bg-white/10 p-8 text-center backdrop-blur-md md:p-12"
	>
		<!-- Error Icon -->
		<div class="mb-6 flex justify-center">
			<div
				class="rounded-full bg-gradient-to-br from-red-400/20 to-orange-400/20 p-6 ring-4 ring-white/20"
			>
				<ErrorIcon class="h-20 w-20" />
			</div>
		</div>

		<!-- Error Status -->
		<div class="mb-4">
			<p class="text-3xl font-bold text-white/90">{status}</p>
		</div>

		<!-- Error Title -->
		<h1 class="mb-4 text-lg font-bold text-white">{errorTitle}</h1>

		<!-- Error Message -->
		<p class="mb-2 text-lg text-white/80">{errorMessage}</p>

		<!-- Help Message -->
		<p class="mb-8 text-sm text-white/60">{helpMessage}</p>

		<!-- Action Buttons -->
		<div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
			<button
				onclick={goBack}
				class="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 font-medium text-white transition-colors hover:bg-white/10"
			>
				<FluentArrowLeft24Regular class="h-5 w-5" />
				<span>Go Back</span>
			</button>

			<button
				onclick={goHome}
				class="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
					/>
				</svg>
				<span>Go Home</span>
			</button>
		</div>
	</div>
</div>
