<!-- src/routes/(dock)/offers/[id]/payment/tether/[paymentId]/+page.svelte -->
<script lang="ts">
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconCheck from '~icons/fluent/checkmark-circle-24-filled';
	import IconSend from '~icons/fluent/send-24-filled';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import CollapsibleHelp from '$lib/components/CollapsibleHelp.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibot } from 'sveltekit-superforms/adapters';
	import { txHashSchema } from './schema';

	let { data } = $props();

	// Track which step user is on
	let step = $state<'send' | 'verify'>('send');
	let copied = $state(false);

	const {
		form: formData,
		errors,
		enhance,
		delayed,
		message
	} = superForm(data.form, {
		validators: valibot(txHashSchema),
		resetForm: false,
		onResult: async ({ result }) => {
			console.log('Payment verify result:', result);
		}
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

{#if step === 'send'}
	<!-- SEND PAYMENT STEP - No form, just information -->
	<BaseLayout title="Send Payment" description={data.offer.name} icon={IconWallet}>
		<!-- Amount Card -->
		<div class="card bg-secondary/10">
			<div class="card-body">
				<div class="text-sm opacity-70">Amount to Send</div>
				<div class="text-4xl font-bold text-secondary">
					{data.payment.amountUsdt} USDT
				</div>
				<div class="text-xs opacity-50">ERC-20 Network</div>
			</div>
		</div>

		<!-- Wallet Address -->
		<div class="form-control">
			<label class="label">
				<span class="label-text font-medium">Platform Wallet Address</span>
			</label>
			<div class="join w-full">
				<input
					type="text"
					value={data.platformWalletAddress}
					readonly
					class="input-bordered input join-item flex-1 font-mono text-xs"
				/>
				<button type="button" onclick={copyAddress} class="btn join-item btn-secondary">
					{#if copied}
						<IconCheck class="size-5" />
					{:else}
						<IconCopy class="size-5" />
					{/if}
				</button>
			</div>
		</div>

		<!-- Instructions -->
		<CollapsibleHelp title="How to send payment">
			<ol class="space-y-3 text-sm">
				<li><strong>1.</strong> Copy the wallet address above</li>
				<li><strong>2.</strong> Open your crypto wallet (MetaMask, Trust Wallet, etc.)</li>
				<li><strong>3.</strong> Select ERC-20 network</li>
				<li><strong>4.</strong> Send exactly <strong>{data.payment.amountUsdt} USDT</strong></li>
				<li><strong>5.</strong> Wait for transaction confirmation</li>
			</ol>
		</CollapsibleHelp>

		<!-- Continue Button - NOT inside a form -->
		<button
			type="button"
			onclick={() => {
				step = 'verify';
			}}
			class="btn w-full btn-lg btn-secondary"
		>
			I've Sent the Payment
			<IconSend class="size-5" />
		</button>
	</BaseLayout>
{:else if step === 'verify'}
	<!-- VERIFY PAYMENT STEP - Contains the actual form -->
	<BaseLayout title="Verify Payment" description={data.offer.name} icon={IconWallet}>
		<!-- Back Button - NOT inside form -->
		<button
			type="button"
			onclick={() => {
				step = 'send';
			}}
			class="btn btn-ghost btn-sm"
			disabled={$delayed}
		>
			<IconArrowLeft class="size-5" />
			Back
		</button>

		<!-- Info Alert -->
		<div class="alert alert-success">
			<IconCheck class="size-6" />
			<span>Payment sent! Now enter your transaction hash to verify.</span>
		</div>

		<!-- Verification Form - ONLY FORM ON THE PAGE -->
		<form method="POST" use:enhance class="space-y-6">
			<div class="form-control">
				<label for="txHash" class="label">
					<span class="label-text font-medium">Transaction Hash</span>
				</label>
				<input
					id="txHash"
					name="txHash"
					type="text"
					placeholder="0x..."
					bind:value={$formData.txHash}
					disabled={$delayed}
					class="input-bordered input font-mono"
					class:input-error={$errors.txHash}
					required
				/>
				{#if $errors.txHash}
					<label class="label">
						<span class="label-text-alt text-error">{$errors.txHash}</span>
					</label>
				{/if}
			</div>

			<!-- Error Message -->
			{#if $message}
				<div class="alert alert-error">
					<span>{$message}</span>
				</div>
			{/if}

			<!-- Help -->
			<CollapsibleHelp title="How to find your transaction hash">
				<ul class="space-y-2 text-sm">
					<li><strong>MetaMask:</strong> Click transaction in Activity tab</li>
					<li><strong>Trust Wallet:</strong> Open transaction history</li>
					<li><strong>Format:</strong> Starts with "0x" followed by 64 characters</li>
				</ul>
			</CollapsibleHelp>

			<!-- Submit -->
			<button type="submit" disabled={$delayed} class="btn w-full btn-lg btn-secondary">
				{#if $delayed}
					<span class="loading loading-spinner"></span>
					Verifying...
				{:else}
					Verify Payment
				{/if}
			</button>
		</form>
	</BaseLayout>
{/if}
