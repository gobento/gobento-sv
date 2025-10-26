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

	const formatPrice = (price: number, currency: string) => {
		if (currency === 'IRR') {
			return new Intl.NumberFormat('fa-IR', {
				style: 'currency',
				currency: 'IRR'
			}).format(price);
		}
		return `${price.toFixed(2)} USDT`;
	};

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
</script>

{#if show}
	<div class="modal modal-open">
		<div class="modal-box max-w-2xl rounded-2xl">
			<!-- Header -->
			<div class="mb-6 flex items-start justify-between">
				<div>
					<h3 class="text-2xl font-bold text-base-content">Complete Payment</h3>
					<p class="mt-1 text-sm font-medium text-base-content/70">{offer.name}</p>
				</div>
				<button
					onclick={onClose}
					disabled={isSubmitting}
					class="btn btn-circle btn-ghost btn-sm"
				>
					<IconClose class="size-5" />
				</button>
			</div>

			<!-- Price Display -->
			<div class="mb-6 rounded-xl bg-primary/10 p-4">
				<div class="flex items-center justify-between">
					<span class="text-sm font-semibold uppercase tracking-wide text-base-content/70">
						Total Amount
					</span>
					<span class="text-3xl font-bold text-primary">
						{formatPrice(offer.price, offer.currency)}
					</span>
				</div>
				<div class="mt-2 text-xs font-medium text-base-content/60">
					<IconInfo class="inline size-3.5" />
					10% platform fee included
				</div>
			</div>

			{#if !selectedMethod}
				<!-- Payment Method Selection -->
				<div class="space-y-3">
					<h4 class="mb-3 text-sm font-semibold uppercase tracking-wide text-base-content/70">
						Select Payment Method
					</h4>

					{#if offer.currency === 'IRR'}
						<!-- Zarinpal (IRR) -->
						<button
							onclick={() => handleMethodSelect('zarinpal')}
							class="group w-full rounded-xl border-2 border-base-300 bg-base-100 p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
						>
							<div class="flex items-center gap-4">
								<div
									class="rounded-lg bg-primary/10 p-3 transition-all group-hover:bg-primary group-hover:text-primary-content"
								>
									<IconCard class="size-6" />
								</div>
								<div class="flex-1">
									<div class="text-lg font-bold text-base-content">Zarinpal</div>
									<div class="text-sm font-medium text-base-content/70">
										Pay with Iranian bank cards
									</div>
								</div>
								<div class="text-sm font-semibold text-primary">→</div>
							</div>
						</button>
					{/if}

					{#if offer.currency === 'USDT' || offer.currency === 'EUR'}
						<!-- Tether (USDT) -->
						<button
							onclick={() => handleMethodSelect('tether')}
							class="group w-full rounded-xl border-2 border-base-300 bg-base-100 p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
						>
							<div class="flex items-center gap-4">
								<div
									class="rounded-lg bg-primary/10 p-3 transition-all group-hover:bg-primary group-hover:text-primary-content"
								>
									<IconWallet class="size-6" />
								</div>
								<div class="flex-1">
									<div class="text-lg font-bold text-base-content">Tether (USDT)</div>
									<div class="text-sm font-medium text-base-content/70">
										Pay with cryptocurrency wallet
									</div>
								</div>
								<div class="text-sm font-semibold text-primary">→</div>
							</div>
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
								// Redirect to Zarinpal
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

					<div class="rounded-xl border border-info bg-info/5 p-4">
						<div class="flex gap-3">
							<IconInfo class="size-5 shrink-0 text-info" />
							<div class="text-sm">
								<p class="font-semibold text-base-content">Secure Payment Gateway</p>
								<p class="mt-1 font-medium text-base-content/70">
									You'll be redirected to Zarinpal to complete your payment securely with your bank
									card.
								</p>
							</div>
						</div>
					</div>

					<div class="modal-action">
						<button
							type="button"
							onclick={() => (selectedMethod = null)}
							disabled={isSubmitting}
							class="btn rounded-lg font-semibold btn-ghost"
						>
							Back
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							class="btn rounded-lg font-semibold btn-primary"
						>
							{#if isSubmitting}
								<span class="loading loading-sm loading-spinner"></span>
								Processing...
							{:else}
								<IconCard class="size-5" />
								Continue to Payment
							{/if}
						</button>
					</div>
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

						{#if !tetherAddress}
							<button
								type="submit"
								disabled={isSubmitting}
								class="btn btn-primary btn-block rounded-lg text-base font-semibold"
							>
								{#if isSubmitting}
									<span class="loading loading-sm loading-spinner"></span>
									Generating Address...
								{:else}
									Get Payment Address
								{/if}
							</button>
						{:else}
							<!-- Show payment address -->
							<div class="space-y-4">
								<div class="rounded-xl border-2 border-warning bg-warning/5 p-4">
									<div class="flex gap-3">
										<IconWarning class="size-5 shrink-0 text-warning" />
										<div class="text-sm">
											<p class="font-semibold text-base-content">Important</p>
											<p class="mt-1 font-medium text-base-content/70">
												Send <strong>exactly {formatPrice(offer.price, 'USDT')}</strong> to the
												address below. Payments expire in 15 minutes.
											</p>
										</div>
									</div>
								</div>

								<div>
									<label class="label">
										<span class="label-text font-semibold">Recipient Address</span>
									</label>
									<div class="flex gap-2">
										<input
											type="text"
											value={tetherAddress}
											readonly
											class="input-bordered input flex-1 rounded-lg font-mono text-sm"
										/>
										<button
											type="button"
											onclick={() => copyToClipboard(tetherAddress)}
											class="btn rounded-lg btn-square"
										>
											{#if copiedAddress}
												<IconCheckmark class="size-5 text-success" />
											{:else}
												<IconCopy class="size-5" />
											{/if}
										</button>
									</div>
								</div>

								<div class="rounded-xl border border-info bg-info/5 p-4">
									<div class="space-y-2 text-sm">
										<p class="font-semibold text-base-content">Steps:</p>
										<ol class="ml-4 list-decimal space-y-1 font-medium text-base-content/70">
											<li>Copy the address above</li>
											<li>Open your crypto wallet (MetaMask, Trust Wallet, etc.)</li>
											<li>Send exactly {formatPrice(offer.price, 'USDT')} USDT (ERC-20)</li>
											<li>Return here and paste the transaction hash below</li>
										</ol>
									</div>
								</div>

								<button
									type="button"
									onclick={() => (showTetherInstructions = false)}
									class="btn btn-primary btn-block rounded-lg font-semibold"
								>
									I've Sent the Payment
								</button>
							</div>
						{/if}

						<div class="modal-action">
							<button
								type="button"
								onclick={() => (selectedMethod = null)}
								disabled={isSubmitting}
								class="btn rounded-lg font-semibold btn-ghost"
							>
								Cancel
							</button>
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

						<div class="space-y-4">
							<div>
								<label for="txHash" class="label">
									<span class="label-text font-semibold">Transaction Hash</span>
								</label>
								<input
									type="text"
									id="txHash"
									name="txHash"
									bind:value={tetherTxHash}
									placeholder="0x..."
									required
									class="input-bordered input w-full rounded-lg font-mono text-sm"
								/>
								<label class="label">
									<span class="label-text-alt font-medium text-base-content/70">
										Paste the transaction hash from your wallet
									</span>
								</label>
							</div>

							<div class="rounded-xl border border-info bg-info/5 p-4">
								<div class="flex gap-3">
									<IconInfo class="size-5 shrink-0 text-info" />
									<div class="text-sm">
										<p class="font-semibold text-base-content">Verification</p>
										<p class="mt-1 font-medium text-base-content/70">
											We'll verify your transaction on the Ethereum blockchain. This may take a few
											moments.
										</p>
									</div>
								</div>
							</div>
						</div>

						<div class="modal-action">
							<button
								type="button"
								onclick={() => (showTetherInstructions = true)}
								disabled={isSubmitting}
								class="btn rounded-lg font-semibold btn-ghost"
							>
								Back
							</button>
							<button
								type="submit"
								disabled={isSubmitting || !tetherTxHash}
								class="btn rounded-lg font-semibold btn-primary"
							>
								{#if isSubmitting}
									<span class="loading loading-sm loading-spinner"></span>
									Verifying...
								{:else}
									<IconCheckmark class="size-5" />
									Verify Payment
								{/if}
							</button>
						</div>
					</form>
				{/if}
			{/if}
		</div>

		<button class="modal-backdrop" onclick={onClose} disabled={isSubmitting}>Close</button>
	</div>
{/if}