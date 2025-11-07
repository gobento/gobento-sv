<!-- src/routes/(dock)/offers/[id]/payment/tether/[paymentId]/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconSend from '~icons/fluent/send-24-filled';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-filled';
	import IconError from '~icons/fluent/error-circle-24-regular';
	import IconSuccess from '~icons/fluent/checkmark-circle-24-filled';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import CollapsibleHelp from '$lib/components/CollapsibleHelp.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibot } from 'sveltekit-superforms/adapters';
	import { txHashSchema } from './schema';

	let { data, form } = $props();

	let copiedField = $state<string | null>(null);
	let transactionSent = $state(false);

	// Only initialize the verify form - no payment form needed
	const verifyForm = superForm(data.form, {
		validators: valibot(txHashSchema),
		resetForm: false,
		onResult: async ({ result }) => {
			if (result.type === 'success' && result.data) {
				const responseData = result.data as any;
				if (responseData?.success && responseData?.reservationId) {
					setTimeout(() => {
						goto(`/reservations/${responseData.reservationId}`);
					}, 2000);
				}
			}
		}
	});

	const { form: formData, errors, enhance, delayed } = verifyForm;

	const copyToClipboard = async (text: string, field: string) => {
		try {
			await navigator.clipboard.writeText(text);
			copiedField = field;
			setTimeout(() => {
				copiedField = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};
</script>

{#if !transactionSent}
	<BaseLayout title="Send Payment" description={data.offerName} icon={IconWallet}>
		<!-- Amount to Send -->
		<div class="rounded-2xl border-2 border-secondary/20 bg-secondary/5 p-6">
			<div class="mb-2 text-sm font-medium text-secondary/70">Amount to Send</div>
			<div class="text-3xl font-bold text-secondary">{data.amountUsdt} USDT</div>
			<div class="mt-1 text-xs text-secondary/50">ERC-20 Network</div>
		</div>

		<!-- Wallet Address -->
		<div>
			<label class="mb-2 block text-sm font-medium">Platform Wallet Address</label>
			<div class="flex gap-2">
				<input
					type="text"
					value={data.platformWalletAddress}
					readonly
					class="input-bordered input flex-1 rounded-lg bg-base-200 font-mono text-xs"
				/>
				<button
					type="button"
					onclick={() => copyToClipboard(data.platformWalletAddress, 'address')}
					class="btn btn-square rounded-lg btn-secondary"
				>
					{#if copiedField === 'address'}
						<IconCheckmark class="size-5" />
					{:else}
						<IconCopy class="size-5" />
					{/if}
				</button>
			</div>
		</div>

		<!-- Instructions -->
		<CollapsibleHelp title="How to send the payment">
			<ol class="space-y-2 text-sm text-base-content/80">
				<li class="flex gap-3">
					<span class="font-semibold text-secondary">1.</span>
					<span>Copy the platform wallet address above</span>
				</li>
				<li class="flex gap-3">
					<span class="font-semibold text-secondary">2.</span>
					<span>Open your crypto wallet (MetaMask, Trust Wallet, etc.)</span>
				</li>
				<li class="flex gap-3">
					<span class="font-semibold text-secondary">3.</span>
					<span>Select the ERC-20 network</span>
				</li>
				<li class="flex gap-3">
					<span class="font-semibold text-secondary">4.</span>
					<span>Send exactly <strong class="text-secondary">{data.amountUsdt} USDT</strong></span>
				</li>
				<li class="flex gap-3">
					<span class="font-semibold text-secondary">5.</span>
					<span>Wait for the transaction to be confirmed</span>
				</li>
			</ol>
		</CollapsibleHelp>

		<!-- Confirm Button -->
		<button
			type="button"
			onclick={() => (transactionSent = true)}
			class="btn w-full rounded-lg btn-secondary"
		>
			I've Sent the Payment
			<IconSend class="size-5" />
		</button>
	</BaseLayout>
{:else if $delayed}
	<BaseLayout title="Verifying Payment" description="Please wait..." icon={IconWallet}>
		<div class="py-12 text-center">
			<div class="mb-6 flex justify-center">
				<span class="loading loading-lg loading-spinner text-secondary"></span>
			</div>
			<p class="text-base-content/70">
				Please wait while we confirm your transaction on the blockchain...
			</p>
			<p class="mt-4 text-sm text-base-content/50">This may take a few moments</p>
		</div>
	</BaseLayout>
{:else if form?.success}
	<BaseLayout title="Payment Successful!" icon={IconSuccess}>
		<div class="py-12 text-center">
			<div class="mb-6 flex justify-center">
				<div class="rounded-full bg-success/20 p-6">
					<IconSuccess class="size-16 text-success" />
				</div>
			</div>
			<h2 class="mb-2 text-2xl font-bold text-success">Payment Successful!</h2>
			<p class="text-base-content/70">Your reservation has been created. Redirecting...</p>
		</div>
	</BaseLayout>
{:else}
	<BaseLayout title="Verify Transaction" description={data.offerName} icon={IconWallet}>
		<!-- Back Button -->
		<div class="flex justify-start">
			<button
				onclick={() => (transactionSent = false)}
				class="btn gap-2 btn-ghost"
				disabled={$delayed}
			>
				<IconArrowLeft class="size-5" />
				Back
			</button>
		</div>

		<!-- Error Message -->
		{#if form?.error}
			<div class="rounded-2xl bg-error/10 p-5">
				<div class="flex gap-3">
					<IconError class="mt-0.5 size-6 text-error" />
					<div class="flex-1">
						<p class="font-medium text-error">Error</p>
						<p class="mt-1 text-sm text-error/80">{form.error}</p>
					</div>
				</div>
			</div>
		{:else if $errors['']}
			<div class="rounded-2xl bg-error/10 p-5">
				<div class="flex gap-3">
					<IconError class="mt-0.5 size-6 text-error" />
					<div class="flex-1">
						<p class="font-medium text-error">Error</p>
						<p class="mt-1 text-sm text-error/80">
							{Array.isArray($errors['']) ? $errors[''][0] : $errors['']}
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Success Message -->
		<div class="rounded-2xl bg-success/10 p-5">
			<div class="flex gap-3">
				<IconCheckmark class="mt-0.5 size-6 text-success" />
				<div>
					<p class="font-medium text-success">Payment Sent!</p>
					<p class="mt-1 text-sm text-success/80">
						Now enter your transaction hash to complete the payment.
					</p>
				</div>
			</div>
		</div>

		<!-- Verification Form - Only form with txHash -->
		<form method="POST" action="?/verifyTetherPayment" use:enhance class="space-y-6">
			<input type="hidden" name="paymentId" bind:value={$formData.paymentId} />

			<!-- Transaction Hash Input -->
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
					class="input-bordered input rounded-xl bg-base-200 font-mono text-sm"
					class:input-error={$errors.txHash}
				/>
				{#if $errors.txHash}
					<label class="label">
						<span class="label-text-alt text-error">{$errors.txHash}</span>
					</label>
				{/if}
			</div>

			<CollapsibleHelp title="How to find your transaction hash">
				<ol class="space-y-2 text-sm text-base-content/80">
					<li class="flex gap-3">
						<span class="font-semibold text-secondary">1.</span>
						<span>In MetaMask: Click on the transaction in Activity tab</span>
					</li>
					<li class="flex gap-3">
						<span class="font-semibold text-secondary">2.</span>
						<span>In Trust Wallet: Open transaction history</span>
					</li>
					<li class="flex gap-3">
						<span class="font-semibold text-secondary">3.</span>
						<span>Look for the hash starting with "0x" followed by 64 characters</span>
					</li>
				</ol>
			</CollapsibleHelp>

			<!-- Submit Button -->
			<button type="submit" disabled={$delayed} class="btn w-full rounded-xl btn-secondary">
				{#if $delayed}
					<span class="loading loading-sm loading-spinner"></span>
					Verifying...
				{:else}
					Verify Payment
					<IconArrowRight class="size-5" />
				{/if}
			</button>
		</form>
	</BaseLayout>
{/if}
