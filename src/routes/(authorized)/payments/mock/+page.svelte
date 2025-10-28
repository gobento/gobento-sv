<!-- src/routes/(authorized)/payments/callback/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconCancel from '~icons/fluent/dismiss-circle-24-regular';
	import IconWarning from '~icons/fluent/warning-24-regular';

	let { data } = $props();

	let processing = $state(false);
	let countdown = $state(3);

	const authority = $page.url.searchParams.get('authority');

	const handleSuccess = async () => {
		processing = true;

		// Simulate processing delay
		const interval = setInterval(() => {
			countdown--;
			if (countdown <= 0) {
				clearInterval(interval);
				// Redirect to callback with success
				window.location.href = `/payments/callback?Authority=${authority}&Status=OK&paymentId=${data.paymentId}`;
			}
		}, 1000);
	};

	const handleFailure = () => {
		// Redirect to callback with failure
		window.location.href = `/payments/callback?Authority=${authority}&Status=NOK&paymentId=${data.paymentId}`;
	};
</script>

<svelte:head>
	<title>Mock Payment Gateway</title>
</svelte:head>

<div class="min-h-screen bg-linear-to-br from-primary/10 to-secondary/10 p-4">
	<div class="mx-auto max-w-2xl">
		<!-- Mock Payment Gateway Header -->
		<div class="mb-8 text-center">
			<div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-warning">
				<IconWarning class="size-10 text-warning-content" />
			</div>
			<h1 class="mb-2 text-lg font-bold text-base-content">Mock Payment Gateway</h1>
			<p class="text-base-content/70">Testing Mode - No Real Money</p>
		</div>

		<!-- Payment Card -->
		<div class="rounded-2xl bg-base-100 p-8">
			{#if !processing}
				<!-- Payment Info -->
				<div class="mb-6 space-y-4">
					<div class="rounded-xl bg-base-200 p-4">
						<div class="mb-2 text-sm font-semibold tracking-wide text-base-content/60 uppercase">
							Authority
						</div>
						<div class="font-mono text-lg text-base-content">{authority}</div>
					</div>

					<div class="rounded-xl bg-base-200 p-4">
						<div class="mb-2 text-sm font-semibold tracking-wide text-base-content/60 uppercase">
							Amount
						</div>
						<div class="text-lg font-bold text-primary">
							{new Intl.NumberFormat('fa-IR', {
								style: 'currency',
								currency: 'IRR'
							}).format(data.amount)}
						</div>
					</div>
				</div>

				<!-- Mock Payment Info -->
				<div class="mb-6 rounded-xl border-2 border-warning bg-warning/10 p-4">
					<div class="flex gap-3">
						<IconWarning class="size-6 shrink-0 text-warning" />
						<div class="text-sm">
							<p class="font-bold text-base-content">This is a Mock Payment</p>
							<p class="mt-1 font-medium text-base-content/70">
								You're in testing mode. Click "Success" to simulate a successful payment, or
								"Failure" to simulate a failed payment. No actual transaction will occur.
							</p>
						</div>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="grid gap-3 sm:grid-cols-2">
					<button onclick={handleSuccess} class="btn rounded-xl text-base font-bold btn-success">
						<IconCheckmark class="size-6" />
						Simulate Success
					</button>

					<button onclick={handleFailure} class="btn rounded-xl text-base font-bold btn-error">
						<IconCancel class="size-6" />
						Simulate Failure
					</button>
				</div>
			{:else}
				<!-- Processing State -->
				<div class="py-12 text-center">
					<div class="mb-6 flex justify-center">
						<span class="loading loading-lg loading-spinner text-primary"></span>
					</div>
					<h2 class="mb-2 text-2xl font-bold text-base-content">Processing Payment</h2>
					<p class="text-base-content/70">
						Redirecting in <span class="font-bold text-primary">{countdown}</span> seconds...
					</p>
				</div>
			{/if}
		</div>

		<!-- Info Footer -->
		<div class="mt-6 rounded-xl bg-info/10 p-4 text-center text-sm">
			<p class="font-semibold text-info">
				💡 Tip: This page only appears when MOCK_PAYMENTS=true in your environment
			</p>
		</div>
	</div>
</div>
