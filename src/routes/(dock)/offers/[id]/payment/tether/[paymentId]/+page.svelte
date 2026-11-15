<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibot } from 'sveltekit-superforms/adapters';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconCheck from '~icons/fluent/checkmark-24-filled';
	import IconSend from '~icons/fluent/send-24-filled';
	import IconArrowRight from '~icons/fluent/arrow-right-24-filled';
	import BaseLayout from '#lib/components/BaseLayout.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import FormField from '#lib/components/ui/FormField.svelte';
	import { toast } from '#lib/components/ui/toast.svelte.js';
	import { formatClock } from '#lib/components/reservations/pickup.js';
	import PaymentProgress from '../../PaymentProgress.svelte';
	import { txHashSchema } from './schema';

	let { data } = $props();

	let verifyOpen = $state(false);
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	// svelte-ignore state_referenced_locally
	const { form: formData, errors, enhance, submitting } = superForm(data.form, {
		validators: valibot(txHashSchema),
		resetForm: false
	});

	const formErrors = $derived($errors._errors ?? []);

	async function copyAddress() {
		try {
			await navigator.clipboard.writeText(data.platformWalletAddress);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 2000);
		} catch {
			toast.error('Could not copy. Select the address and copy it manually.');
		}
	}

	$effect(() => () => clearTimeout(copyTimer));

	const STEPS = [
		'Copy the wallet address below',
		'Open your crypto wallet and choose the ERC-20 network',
		'Send exactly the amount shown',
		'Come back and confirm with the transaction hash'
	];
</script>

<svelte:head>
	<title>Send payment · {data.offer.name}</title>
</svelte:head>

<BaseLayout
	title="Send your payment"
	description={data.offer.name}
	width="narrow"
	backHref="/offers/{data.offer.id}/payment"
	backLabel="Back to checkout"
>
	<div class="space-y-5 pb-24 md:pb-0">
		<PaymentProgress current={3} />

		<section class="surface animate-rise-in overflow-hidden text-center">
			<div class="p-6">
				<p class="eyebrow">Amount to send</p>
				<p class="tabular mt-2 text-4xl font-extrabold tracking-tight">
					{data.payment.amountUsdt}
					<span class="text-xl text-base-content/60">USDT</span>
				</p>
				<span class="mt-3 badge badge-ghost font-bold">ERC-20 network</span>
			</div>
			{#if data.payment.expiresAt}
				<p class="border-t border-dashed border-base-300 bg-base-200/60 px-5 py-3 text-sm">
					Your bag is held until
					<span class="tabular font-bold">{formatClock(data.payment.expiresAt)}</span>
				</p>
			{/if}
		</section>

		<section class="surface space-y-3 p-5">
			<h2 class="font-extrabold">Send to this wallet address</h2>
			<div class="rounded-2xl bg-base-200/60 p-4">
				<p class="font-mono text-sm break-all select-all" dir="ltr">
					{data.platformWalletAddress}
				</p>
			</div>
			<Button
				variant={copied ? 'success' : 'neutral'}
				outline={!copied}
				block
				icon={copied ? IconCheck : IconCopy}
				onclick={copyAddress}
			>
				{copied ? 'Copied' : 'Copy address'}
			</Button>
		</section>

		<Alert type="warn">
			Send the <strong>exact amount</strong> on the <strong>ERC-20</strong> network. A different amount
			or network can delay or fail your reservation.
		</Alert>

		<section class="surface p-5">
			<h2 class="font-extrabold">How it works</h2>
			<ol class="mt-3 space-y-3 text-sm">
				{#each STEPS as text, i (text)}
					<li class="flex items-start gap-3">
						<span
							class="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary"
						>
							{i + 1}
						</span>
						<span class="pt-0.5 text-base-content/75">{text}</span>
					</li>
				{/each}
			</ol>
		</section>

		<div
			class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[1000] border-t border-base-300/70 bg-base-100/90 px-4 py-3 backdrop-blur-xl md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
		>
			<Button block size="lg" iconRight={IconArrowRight} onclick={() => (verifyOpen = true)}>
				I have sent the payment
			</Button>
		</div>
	</div>
</BaseLayout>

<Modal bind:open={verifyOpen} title="Confirm your transfer" position="bottom">
	<form method="POST" use:enhance class="space-y-4">
		<p class="text-sm text-base-content/70">
			Paste the transaction hash from your wallet so we can confirm the transfer and secure your
			reservation.
		</p>

		{#if formErrors.length}
			<Alert type="error">{formErrors.join(' ')}</Alert>
		{/if}

		<FormField
			label="Transaction hash"
			for="txHash"
			error={$errors.txHash?.[0]}
			hint="Starts with 0x followed by 64 characters. You find it in your wallet's activity or transaction history."
		>
			<input
				id="txHash"
				name="txHash"
				type="text"
				dir="ltr"
				placeholder="0x…"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				bind:value={$formData.txHash}
				readonly={$submitting}
				aria-invalid={$errors.txHash ? 'true' : undefined}
				class="input w-full font-mono {$errors.txHash ? 'input-error' : ''}"
				required
			/>
		</FormField>

		<Button
			type="submit"
			block
			size="lg"
			icon={IconSend}
			loading={$submitting}
			loadingLabel="Verifying…"
		>
			Verify payment
		</Button>
	</form>
</Modal>
