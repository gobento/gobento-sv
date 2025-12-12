<!-- src/routes/(public)/contact/+page.svelte -->
<script lang="ts">
	import FluentEmojiFlatBentoBox from '~icons/fluent-emoji-flat/bento-box';
	import FluentMail24Regular from '~icons/fluent/mail-24-regular';
	import FluentErrorCircle24Regular from '~icons/fluent/error-circle-24-regular';
	import { page } from '$app/state';

	const errorId = $derived(page.url.searchParams.get('errorId'));
	const hasError = $derived(!!errorId);
</script>

<svelte:head>
	<title>GoBento | Contact</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-4">
	<!-- Hero Section -->
	<div class="mb-12 text-center">
		<div class="mb-4 flex justify-center">
			<FluentEmojiFlatBentoBox class="h-20 w-20" />
		</div>
		<h1 class="mb-3 text-3xl font-bold text-white">Contact Us</h1>
		<p class="text-lg text-white/70">
			We're here to help! Reach out to us for any questions or concerns.
		</p>
	</div>

	<!-- Error Alert -->
	{#if hasError}
		<div class="mb-6 alert border border-warning/30 bg-warning/10">
			<FluentErrorCircle24Regular class="size-6 text-warning" />
			<div>
				<p class="font-medium">Reporting an error</p>
				<p class="text-sm opacity-80">
					Error ID <span class="font-mono font-semibold">{errorId}</span> has been pre-filled below
				</p>
			</div>
		</div>
	{/if}

	<!-- Contact Form -->
	<div class="card border border-white/20 bg-white/10 backdrop-blur-md">
		<div class="card-body">
			<h2 class="mb-3 card-title text-white">Contact Form</h2>
			<form class="space-y-4">
				<div class="form-control">
					<label class="label" for="name">
						<span class="label-text font-medium">Name*</span>
					</label>
					<input
						id="name"
						type="text"
						placeholder="Enter your name"
						class="input-bordered input w-full"
						required
					/>
				</div>

				<div class="form-control">
					<label class="label" for="email">
						<span class="label-text font-medium">Email*</span>
					</label>
					<input
						id="email"
						type="email"
						placeholder="Enter your email"
						class="input-bordered input w-full"
						required
					/>
				</div>

				{#if hasError}
					<div class="form-control">
						<label class="label" for="errorId">
							<span class="label-text font-medium">Error ID</span>
						</label>
						<input
							id="errorId"
							type="text"
							value={errorId}
							class="input-bordered input w-full font-mono"
							readonly
						/>
					</div>
				{/if}

				<div class="form-control">
					<label class="label" for="message">
						<span class="label-text font-medium">Message*</span>
					</label>
					<textarea
						id="message"
						placeholder={hasError
							? 'Please describe what you were doing when the error occurred...'
							: 'Enter your message'}
						class="textarea-bordered textarea w-full"
						rows="5"
						required
					></textarea>
				</div>

				<button class="btn gap-2 btn-primary">
					<FluentMail24Regular class="size-5" />
					<span>Submit</span>
				</button>
			</form>
		</div>
	</div>
</div>
