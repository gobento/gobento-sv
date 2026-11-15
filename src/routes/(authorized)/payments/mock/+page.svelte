<!-- Stand-in for the external payment gateway. Only reachable in mock mode. -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import IconBeaker from '~icons/fluent/beaker-24-regular';
	import IconLock from '~icons/fluent/lock-closed-24-filled';
	import IconCard from '~icons/fluent/payment-24-regular';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatPrice } from '#lib/util.js';

	let { data } = $props();

	let pending = $state<'OK' | 'NOK' | null>(null);

	const amount = $derived(formatPrice(data.payment.amount, data.payment.currency));
	const settled = $derived(data.payment.status !== 'processing');

	function callbackHref(status: 'OK' | 'NOK') {
		const query = new URLSearchParams({
			Authority: data.authority,
			Status: status,
			paymentId: data.payment.id
		});
		return `/payments/callback?${query}`;
	}
</script>

<svelte:head>
	<title>Sandbox payment · GoBento</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<div
		class="flex items-center justify-center gap-2 bg-warning px-4 py-2.5 text-sm font-extrabold text-warning-content"
		role="status"
	>
		<IconBeaker class="size-5 shrink-0" />
		Sandbox payment · no real money moves
	</div>

	<main class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
		<div class="surface animate-rise-in overflow-hidden">
			<div class="flex items-center gap-3 border-b border-base-300/70 px-5 py-4">
				<div
					class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral text-neutral-content"
				>
					<IconCard class="size-5" />
				</div>
				<div class="min-w-0">
					<p class="leading-tight font-extrabold">Demo Pay</p>
					<p class="text-xs text-base-content/55">Simulated payment gateway</p>
				</div>
				<span class="ms-auto badge badge-sm font-bold badge-warning">Test mode</span>
			</div>

			<div class="space-y-5 p-5">
				<div class="text-center">
					<p class="eyebrow">Amount due</p>
					<p class="tabular mt-1 text-4xl font-extrabold tracking-tight">{amount}</p>
				</div>

				<dl class="space-y-2.5 rounded-2xl bg-base-200/60 p-4 text-sm">
					<div class="flex justify-between gap-4">
						<dt class="text-base-content/60">Paying</dt>
						<dd class="truncate font-bold">{data.payment.businessName}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-base-content/60">For</dt>
						<dd class="truncate font-bold">{data.payment.offerName}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="shrink-0 text-base-content/60">Reference</dt>
						<dd class="truncate font-mono text-xs leading-5" dir="ltr">{data.authority}</dd>
					</div>
				</dl>

				{#if settled}
					<Alert type="info">
						This payment has already been {data.payment.status === 'completed'
							? 'completed'
							: 'closed'}. Start a new one from the offer.
					</Alert>
					<Button
						href={resolve('/(dock)/offers/[id]', { id: data.payment.offerId })}
						block
						size="lg">Back to the offer</Button
					>
				{:else}
					<div class="space-y-2">
						<Button
							href={callbackHref('OK')}
							block
							size="lg"
							icon={IconLock}
							loading={pending === 'OK'}
							loadingLabel="Approving…"
							disabled={pending === 'NOK'}
							onclick={() => (pending = 'OK')}
						>
							Approve payment of {amount}
						</Button>
						<Button
							href={callbackHref('NOK')}
							variant="ghost"
							block
							loading={pending === 'NOK'}
							loadingLabel="Cancelling…"
							disabled={pending === 'OK'}
							onclick={() => (pending = 'NOK')}
						>
							Cancel and return
						</Button>
					</div>
				{/if}
			</div>
		</div>

		<p class="mt-5 text-center text-xs text-base-content/55">
			You see this page because the app runs with demo data. With live payments, customers are sent
			to the real payment provider instead.
		</p>
	</main>
</div>
