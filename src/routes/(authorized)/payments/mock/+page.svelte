<!-- src/routes/(authorized)/payments/mock/+page.svelte -->
<script lang="ts">
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconCancel from '~icons/fluent/dismiss-circle-24-regular';
	import IconWarning from '~icons/fluent/warning-24-regular';
	import IconInfo from '~icons/fluent/info-24-regular';
	import { page } from '$app/state';

	let { data } = $props();

	let processing = $state(false);
	let countdown = $state(3);

	const authority = page.url.searchParams.get('authority');
	const amount = page.url.searchParams.get('amount');

	const formatPrice = (price: string) => {
		const num = parseFloat(price);
		return new Intl.NumberFormat('fa-IR').format(num) + ' تومان';
	};

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
	<title>Mock Payment Gateway - Testing Mode</title>
</svelte:head>

<div class="min-h-screen from-warning/10 via-base-100 to-warning/5 p-4">
	<div class="mx-auto max-w-2xl py-8">
		<!-- Mock Gateway Header -->
		<div class="mb-8 text-center">
			<div
				class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full from-warning/30 to-warning/10 shadow-lg"
			>
				<IconWarning class="size-10 text-warning" />
			</div>
			<h1 class="mb-2 text-2xl font-bold">Mock Payment Gateway</h1>
			<p class="text-base-content/70">Development Testing Mode</p>
			<p class="mt-1 text-sm text-warning">No Real Money • Simulated Transactions Only</p>
		</div>

		<!-- Payment Card -->
		<div class="rounded-2xl border-2 border-warning/30 bg-base-100 p-8 shadow-xl">
			{#if !processing}
				<!-- Mock Warning Banner -->
				<div class="mb-8 rounded-xl border-2 border-warning from-warning/20 to-warning/10 p-5">
					<div class="flex gap-4">
						<IconInfo class="size-6 shrink-0 text-warning" />
						<div class="text-sm">
							<p class="font-bold text-warning">Testing Environment Active</p>
							<p class="mt-2 text-base-content">
								This is a simulated payment gateway for development testing. No actual payment will
								be processed. In production, users would be redirected to Zarinpal's secure payment
								gateway.
							</p>
						</div>
					</div>
				</div>

				<!-- Payment Details -->
				<div class="mb-8 space-y-4">
					<div class="rounded-xl from-base-200 to-base-100 p-5">
						<div class="mb-2 text-xs font-bold tracking-wider text-base-content/60 uppercase">
							Authority Code
						</div>
						<div class="font-mono text-sm break-all text-primary">{authority}</div>
					</div>

					<div class="rounded-xl from-primary/10 to-primary/5 p-5">
						<div class="mb-2 text-xs font-bold tracking-wider text-primary uppercase">
							Payment Amount
						</div>
						<div class="text-2xl font-bold text-primary">
							{amount ? formatPrice(amount) : 'N/A'}
						</div>
					</div>

					{#if data.paymentId}
						<div class="rounded-xl from-base-200 to-base-100 p-5">
							<div class="mb-2 text-xs font-bold tracking-wider text-base-content/60 uppercase">
								Payment ID
							</div>
							<div class="font-mono text-sm break-all text-base-content/70">{data.paymentId}</div>
						</div>
					{/if}
				</div>

				<!-- Payment Flow Explanation -->
				<div class="mb-8 rounded-xl bg-info/10 p-5">
					<div class="flex gap-3">
						<IconInfo class="mt-0.5 size-5  text-info" />
						<div class="text-sm">
							<p class="font-medium text-info">How It Works (Production)</p>
							<ol class="mt-2 ml-5 list-decimal space-y-1 text-base-content/80">
								<li>User is redirected to Zarinpal's secure gateway</li>
								<li>User completes payment via Zarinpal</li>
								<li>Payment goes to our platform merchant account</li>
								<li>Platform verifies payment with Zarinpal</li>
								<li>Reservation is created automatically</li>
								<li>Business portion is transferred (minus 10% fee)</li>
							</ol>
						</div>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="grid gap-4 sm:grid-cols-2">
					<button
						onclick={handleSuccess}
						class="btn rounded-xl text-base font-bold transition-all btn-success hover:scale-105"
					>
						<IconCheckmark class="size-6" />
						Simulate Success
					</button>

					<button
						onclick={handleFailure}
						class="btn rounded-xl text-base font-bold transition-all btn-error hover:scale-105"
					>
						<IconCancel class="size-6" />
						Simulate Failure
					</button>
				</div>

				<p class="mt-6 text-center text-xs text-base-content/50">
					Choose an option to continue the payment flow
				</p>
			{:else}
				<!-- Processing State -->
				<div class="py-12 text-center">
					<div class="mb-6 flex justify-center">
						<span class="loading loading-lg loading-spinner text-success"></span>
					</div>
					<h2 class="mb-2 text-2xl font-bold text-success">Processing Mock Payment</h2>
					<p class="text-base-content/70">Simulating payment verification...</p>
					<p class="mt-4 text-lg font-semibold text-success">
						Redirecting in <span class="tabular-nums">{countdown}</span> second{countdown !== 1
							? 's'
							: ''}
					</p>
				</div>
			{/if}
		</div>

		<!-- Environment Info Footer -->
		<div class="mt-6 rounded-xl from-warning/20 to-warning/10 p-5 text-center">
			<p class="font-semibold text-warning">💡 Development Mode</p>
			<p class="mt-2 text-sm text-base-content/70">
				Set <code class="rounded bg-base-200 px-2 py-1 font-mono text-xs">MOCK_PAYMENTS=false</code>
				in your environment to enable real Zarinpal payments
			</p>
		</div>
	</div>
</div>
