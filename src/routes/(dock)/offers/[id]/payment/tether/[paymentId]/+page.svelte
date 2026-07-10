<!-- src/routes/(dock)/offers/[id]/payment/tether/[paymentId]/+page.svelte -->
<script lang="ts">
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconCheck from '~icons/fluent/checkmark-circle-24-filled';
	import IconSend from '~icons/fluent/send-24-filled';
	import IconArrowRight from '~icons/fluent/arrow-right-24-filled';
	import IconWarning from '~icons/fluent/warning-24-regular';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import CollapsibleHelp from '$lib/components/CollapsibleHelp.svelte';
	import PaymentProgress from '../../PaymentProgress.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibot } from 'sveltekit-superforms/adapters';
	import { txHashSchema } from './schema';

	let { data } = $props();

	let verifyOpen = $state(false);
	let copied = $state(false);

	const {
		form: formData,
		errors,
		enhance,
		delayed,
		message
	} = superForm(data.form, {
		validators: valibot(txHashSchema),
		resetForm: false
	});

	async function copyAddress() {
		try {
			await navigator.clipboard.writeText(data.platformWalletAddress);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Copy failed:', err);
		}
	}
</script>

<BaseLayout title="Send Payment" description={data.offer.name} icon={IconWallet}>
	<div class="space-y-6">
		<PaymentProgress current={2} />

		<!-- Amount Card -->
		<div
			class="overflow-hidden rounded-3xl border border-secondary/20 bg-linear-to-br from-secondary/15 via-secondary/5 to-base-100 p-6 text-center"
		>
			<div class="text-xs font-bold tracking-wider text-secondary/70 uppercase">Amount to send</div>
			<div class="mt-1 text-4xl font-extrabold text-secondary">
				{data.payment.amountUsdt} USDT
			</div>
			<div class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-base-100/70 px-3 py-1">
				<span class="size-2 rounded-full bg-secondary"></span>
				<span class="text-xs font-medium text-base-content/70">ERC-20 Network</span>
			</div>
		</div>

		<!-- Wallet Address -->
		<div>
			<div class="mb-2 text-sm font-medium">Send to this wallet address</div>
			<button
				type="button"
				onclick={copyAddress}
				class="group flex w-full items-center gap-3 rounded-2xl border-2 border-base-300 bg-base-100 p-4 text-left transition-all hover:border-secondary"
			>
				<span class="flex-1 font-mono text-xs break-all text-base-content/80">
					{data.platformWalletAddress}
				</span>
				<span
					class="flex shrink-0 items-center gap-1.5 text-sm font-semibold {copied
						? 'text-success'
						: 'text-secondary'}"
				>
					{#if copied}
						<IconCheck class="size-5" />
						Copied
					{:else}
						<IconCopy class="size-5" />
						Copy
					{/if}
				</span>
			</button>
		</div>

		<!-- Exact amount warning -->
		<Alert type="warn">
			Send the <strong>exact amount</strong> shown above. Sending a different amount may delay or fail
			your reservation.
		</Alert>

		<!-- Instructions -->
		<CollapsibleHelp title="How to send payment">
			<ol class="space-y-3 text-sm">
				<li><strong>1.</strong> Copy the wallet address above</li>
				<li><strong>2.</strong> Open your crypto wallet (MetaMask, Trust Wallet, etc.)</li>
				<li><strong>3.</strong> Select the ERC-20 network</li>
				<li><strong>4.</strong> Send exactly <strong>{data.payment.amountUsdt} USDT</strong></li>
				<li><strong>5.</strong> Wait for the transaction to confirm, then verify below</li>
			</ol>
		</CollapsibleHelp>

		<!-- Continue to verification -->
		<button
			type="button"
			onclick={() => (verifyOpen = true)}
			class="btn w-full btn-lg btn-secondary"
		>
			I've sent the payment
			<IconArrowRight class="size-5" />
		</button>
	</div>
</BaseLayout>

<!-- Verification bottom sheet -->
<Modal bind:open={verifyOpen} title="Verify your payment" position="bottom">
	<div class="space-y-5">
		<div class="flex items-start gap-3 rounded-2xl bg-success/10 p-4 text-success">
			<IconCheck class="mt-0.5 size-6 shrink-0" />
			<p class="text-sm">
				Great! Paste your transaction hash below so we can confirm the transfer and secure your
				reservation.
			</p>
		</div>

		<form method="POST" use:enhance class="space-y-4">
			<div class="form-control">
				<label for="txHash" class="label">
					<span class="label-text font-medium">Transaction hash</span>
				</label>
				<input
					id="txHash"
					name="txHash"
					type="text"
					placeholder="0x…"
					bind:value={$formData.txHash}
					disabled={$delayed}
					class="input-bordered input w-full font-mono"
					class:input-error={$errors.txHash}
					required
				/>
				{#if $errors.txHash}
					<label class="label" for="txHash">
						<span class="label-text-alt text-error">{$errors.txHash}</span>
					</label>
				{/if}
			</div>

			{#if $message}
				<div class="flex items-center gap-2 rounded-xl bg-error/10 p-3 text-sm text-error">
					<IconWarning class="size-5 shrink-0" />
					<span>{$message}</span>
				</div>
			{/if}

			<CollapsibleHelp title="Where do I find the transaction hash?">
				<ul class="space-y-2 text-sm">
					<li><strong>MetaMask:</strong> Click the transaction in the Activity tab</li>
					<li><strong>Trust Wallet:</strong> Open your transaction history</li>
					<li><strong>Format:</strong> Starts with "0x" followed by 64 characters</li>
				</ul>
			</CollapsibleHelp>

			<button type="submit" disabled={$delayed} class="btn w-full btn-lg btn-secondary">
				{#if $delayed}
					<span class="loading loading-spinner"></span>
					Verifying…
				{:else}
					<IconSend class="size-5" />
					Verify payment
				{/if}
			</button>
		</form>
	</div>
</Modal>
