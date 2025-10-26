<!-- src/lib/components/PaymentModal.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconClose from '~icons/fluent/dismiss-24-regular';
	import IconCard from '~icons/fluent/payment-24-regular';
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconWarning from '~icons/fluent/warning-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import { formatPrice } from '$lib/util';

	interface Props {
		show: boolean;
		offer: {
			id: string;
			name: string;
			price: number;
			currency: string;
		};
		pickupDate: string;
		onClose: () => void;
	}

	let { show, offer, pickupDate, onClose }: Props = $props();

	let selectedMethod = $state<'zarinpal' | 'tether' | null>(null);
	let isSubmitting = $state(false);
	let tetherAddress = $state('');
	let tetherTxHash = $state('');
	let showTetherInstructions = $state(false);
	let copiedAddress = $state(false);

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			copiedAddress = true;
			setTimeout(() => (copiedAddress = false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};

	const handleMethodSelect = (method: 'zarinpal' | 'tether') => {
		selectedMethod = method;
		if (method === 'tether') {
			showTetherInstructions = true;
		}
	};

	const handleBack = () => {
		if (selectedMethod === 'tether' && !showTetherInstructions) {
			showTetherInstructions = true;
		} else {
			selectedMethod = null;
			showTetherInstructions = false;
			tetherAddress = '';
			tetherTxHash = '';
		}
	};
</script>

<dialog class="modal" class:modal-open={show}>
	<div class="modal-box max-w-xl rounded-3xl">
		<!-- Header -->
		<div class="mb-8 flex items-start justify-between">
			<div class="flex items-center gap-3">
				{#if selectedMethod}
					<button
						onclick={handleBack}
						disabled={isSubmitting}
						class="btn btn-circle btn-ghost btn-sm"
					>
						<IconArrowLeft class="size-5" />
					</button>
				{/if}
				<div>
					<h3 class="text-xl font-semibold">Complete Payment</h3>
					<p class="mt-1 text-sm opacity-60">{offer.name}</p>
				</div>
			</div>
			<button onclick={onClose} disabled={isSubmitting} class="btn btn-circle btn-ghost btn-sm">
				<IconClose class="size-5" />
			</button>
		</div>

		<!-- Price Display -->
		<div class="mb-8 rounded-2xl bg-primary/10 p-6">
			<div class="flex items-baseline justify-between">
				<span class="text-sm font-medium text-primary">Total Amount</span>
				<span class="text-3xl font-semibold text-primary"
					>{formatPrice(offer.price, offer.currency)}</span
				>
			</div>
			<p class="mt-2 text-xs opacity-50">Includes 10% platform fee</p>
		</div>

		{#if !selectedMethod}
			<!-- Payment Method Selection -->
			<div class="mb-6 space-y-3">
				<h4 class="mb-4 text-sm font-medium opacity-60">Select Payment Method</h4>

				{#if offer.currency === 'IRR'}
					<button
						onclick={() => handleMethodSelect('zarinpal')}
						class="flex w-full items-center gap-4 rounded-2xl border-2 border-base-300 p-5 text-left transition-all hover:border-primary hover:bg-primary/5"
					>
						<div class="rounded-xl bg-primary/10 p-3">
							<IconCard class="size-6 text-primary" />
						</div>
						<div class="flex-1">
							<div class="font-semibold">Zarinpal</div>
							<div class="text-sm opacity-60">Iranian bank cards</div>
						</div>
						<span class="text-primary">→</span>
					</button>
				{/if}

				{#if offer.currency === 'USDT' || offer.currency === 'EUR'}
					<button
						onclick={() => handleMethodSelect('tether')}
						class="flex w-full items-center gap-4 rounded-2xl border-2 border-base-300 p-5 text-left transition-all hover:border-secondary hover:bg-secondary/5"
					>
						<div class="rounded-xl bg-secondary/10 p-3">
							<IconWallet class="size-6 text-secondary" />
						</div>
						<div class="flex-1">
							<div class="font-semibold">Tether (USDT)</div>
							<div class="text-sm opacity-60">Cryptocurrency wallet</div>
						</div>
						<span class="text-secondary">→</span>
					</button>
				{/if}
			</div>
		{:else if selectedMethod === 'zarinpal'}
			<!-- Zarinpal Payment Form -->
			<form
				method="POST"
				action="?/initPayment"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						if (result.type === 'redirect') {
							window.location.href = result.location;
						} else {
							await update();
							isSubmitting = false;
						}
					};
				}}
			>
				<input type="hidden" name="paymentMethod" value="zarinpal" />
				<input type="hidden" name="pickupDate" value={pickupDate} />

				<div class="mb-6">
					<div class="rounded-2xl bg-primary/10 p-5">
						<div class="flex gap-3">
							<IconInfo class="mt-0.5 size-5 flex-shrink-0 text-primary" />
							<div class="text-sm">
								<p class="font-medium">Secure Payment Gateway</p>
								<p class="mt-1 opacity-70">
									You'll be redirected to Zarinpal to complete your payment with your bank card.
								</p>
							</div>
						</div>
					</div>
				</div>

				<button type="submit" disabled={isSubmitting} class="btn w-full rounded-xl btn-primary">
					{#if isSubmitting}
						<span class="loading loading-sm loading-spinner"></span>
						Processing...
					{:else}
						Continue to Payment
					{/if}
				</button>
			</form>
		{:else if selectedMethod === 'tether'}
			<!-- Tether Payment Form -->
			{#if showTetherInstructions && !tetherTxHash}
				<!-- Step 1: Show payment instructions -->
				<form
					method="POST"
					action="?/initPayment"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success' && result.data?.tetherAddress) {
								tetherAddress = result.data.tetherAddress;
								isSubmitting = false;
							} else {
								isSubmitting = false;
							}
						};
					}}
				>
					<input type="hidden" name="paymentMethod" value="tether" />
					<input type="hidden" name="pickupDate" value={pickupDate} />

					<div class="mb-6 space-y-5">
						{#if !tetherAddress}
							<button
								type="submit"
								disabled={isSubmitting}
								class="btn w-full rounded-xl btn-secondary"
							>
								{#if isSubmitting}
									<span class="loading loading-sm loading-spinner"></span>
									Generating Address...
								{:else}
									Get Payment Address
								{/if}
							</button>
						{:else}
							<div class="rounded-2xl bg-warning/10 p-5">
								<div class="flex gap-3">
									<IconWarning class="mt-0.5 size-5 flex-shrink-0 text-warning" />
									<div class="text-sm">
										<p class="font-medium">Important</p>
										<p class="mt-1 opacity-80">
											Send exactly <span class="font-semibold text-secondary"
												>{formatPrice(offer.price, 'USDT')}</span
											> to the address below. Payments expire in 15 minutes.
										</p>
									</div>
								</div>
							</div>

							<div>
								<label class="mb-2 block text-sm font-medium text-secondary"
									>Recipient Address</label
								>
								<div class="flex gap-2">
									<input
										type="text"
										value={tetherAddress}
										readonly
										class="input-bordered input flex-1 rounded-xl font-mono text-xs focus:border-secondary"
									/>
									<button
										type="button"
										onclick={() => copyToClipboard(tetherAddress)}
										class="btn btn-square rounded-xl btn-secondary"
									>
										{#if copiedAddress}
											<IconCheckmark class="size-5" />
										{:else}
											<IconCopy class="size-5" />
										{/if}
									</button>
								</div>
							</div>

							<div class="rounded-2xl bg-secondary/10 p-5">
								<p class="mb-3 text-sm font-medium text-secondary">Steps:</p>
								<ol class="ml-5 list-decimal space-y-2 text-sm opacity-80">
									<li>Copy the address above</li>
									<li>Open your crypto wallet (MetaMask, Trust Wallet, etc.)</li>
									<li>Send exactly {formatPrice(offer.price, 'USDT')} USDT (ERC-20)</li>
									<li>Return here and paste the transaction hash</li>
								</ol>
							</div>

							<button
								type="button"
								onclick={() => (showTetherInstructions = false)}
								class="btn w-full rounded-xl btn-secondary"
							>
								I've Sent the Payment
							</button>
						{/if}
					</div>
				</form>
			{:else}
				<!-- Step 2: Verify transaction -->
				<form
					method="POST"
					action="?/verifyTether"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							await update();
							isSubmitting = false;
						};
					}}
				>
					<input type="hidden" name="tetherAddress" value={tetherAddress} />
					<input type="hidden" name="pickupDate" value={pickupDate} />

					<div class="mb-6 space-y-5">
						<div>
							<label for="txHash" class="mb-2 block text-sm font-medium text-secondary">
								Transaction Hash
							</label>
							<input
								type="text"
								id="txHash"
								name="txHash"
								bind:value={tetherTxHash}
								placeholder="0x..."
								required
								class="input-bordered input w-full rounded-xl font-mono text-sm focus:border-secondary"
							/>
							<p class="mt-2 text-xs opacity-50">Paste the transaction hash from your wallet</p>
						</div>

						<div class="rounded-2xl bg-secondary/10 p-5">
							<div class="flex gap-3">
								<IconInfo class="mt-0.5 size-5 shrink-0 text-secondary" />
								<div class="text-sm">
									<p class="font-medium">Verification</p>
									<p class="mt-1 opacity-70">
										We'll verify your transaction on the Ethereum blockchain. This may take a few
										moments.
									</p>
								</div>
							</div>
						</div>
					</div>

					<button
						type="submit"
						disabled={isSubmitting || !tetherTxHash}
						class="btn w-full rounded-xl btn-secondary"
					>
						{#if isSubmitting}
							<span class="loading loading-sm loading-spinner"></span>
							Verifying...
						{:else}
							Verify Payment
						{/if}
					</button>
				</form>
			{/if}
		{/if}
	</div>

	<form method="dialog" class="modal-backdrop">
		<button onclick={onClose} disabled={isSubmitting}>close</button>
	</form>
</dialog>
