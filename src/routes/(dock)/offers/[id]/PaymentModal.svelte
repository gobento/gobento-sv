<!-- src/routes/(dock)/offers/[id]/PaymentModal.svelte -->
<script lang="ts">
	import IconClose from '~icons/fluent/dismiss-24-regular';
	import IconBank from '~icons/fluent/building-bank-24-regular';
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconWarning from '~icons/fluent/warning-24-regular';
	import IconError from '~icons/fluent/error-circle-24-regular';
	import IconSuccess from '~icons/fluent/checkmark-circle-24-filled';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-filled';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconSend from '~icons/fluent/send-24-filled';
	import { superForm } from 'sveltekit-superforms';
	import { valibot } from 'sveltekit-superforms/adapters';
	import { txHashSchema } from './schema';

	interface Props {
		show: boolean;
		offer: {
			id: string;
			name: string;
			price: number;
			currency: string;
		};
		businessPaymentMethods: {
			ibanEnabled: boolean;
			tetherEnabled: boolean;
			preferredMethod: 'iban' | 'tether';
		};
		pickupDate: string;
		minDate: string;
		maxDate: string;
		isRecurring: boolean;
		locationName?: string;
		tetherPaymentAddress: string;
		onClose: () => void;
	}

	let {
		show,
		offer,
		businessPaymentMethods,
		pickupDate,
		minDate,
		maxDate,
		isRecurring,
		locationName,
		tetherPaymentAddress,
		onClose
	}: Props = $props();

	type PaymentStep = 'select' | 'tether-send' | 'tether-verify' | 'waiting' | 'success';

	interface IbanPaymentData {
		success: boolean;
		paymentId: string;
		paymentMethod: 'iban';
		zarinpalAuthority: string;
		zarinpalPaymentUrl: string;
		amount: number;
		currency: string;
		pickupDate: string;
		offerName: string;
	}

	interface TetherPaymentData {
		success: boolean;
		paymentId: string;
		paymentMethod: 'tether';
		platformWalletAddress: string;
		amountUsdt: number;
		pickupDate: string;
		offerName: string;
	}

	type PaymentData = IbanPaymentData | TetherPaymentData;

	let step = $state<PaymentStep>('select');
	let selectedMethod = $state<'iban' | 'tether' | null>(null);
	let processing = $state(false);
	let paymentData = $state<PaymentData | null>(null);
	let copiedField = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let localPickupDate = $state(pickupDate);
	let transactionSent = $state(false);

	// Valibot schema for transaction hash

	const form = superForm(
		{ txHash: '' },
		{
			validators: valibot(txHashSchema),
			resetForm: false,
			onSubmit: () => {
				errorMessage = null;
			},
			onResult: async ({ result }) => {
				if (result.type === 'success' && result.data) {
					step = 'success';
					setTimeout(() => {
						window.location.href = `/reservations/${result.data.reservationId}`;
					}, 2000);
				} else if (result.type === 'failure') {
					errorMessage = result.data?.error || 'Payment verification failed';
				} else if (result.type === 'error') {
					errorMessage = result.error?.message || 'An error occurred';
				}
			}
		}
	);

	const { form: formData, errors, enhance, delayed } = form;

	$effect(() => {
		localPickupDate = pickupDate;
	});

	const formatPrice = (price: number, currency: string) => {
		if (currency === 'USDT') {
			return `${price.toFixed(2)} USDT`;
		}
		if (currency === 'IRR') {
			return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
		}
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: currency
		}).format(price);
	};

	const formatDateDisplay = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	};

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

	const clearMessages = () => {
		errorMessage = null;
	};

	const handleMethodSelect = async (method: 'iban' | 'tether') => {
		clearMessages();
		selectedMethod = method;
		processing = true;

		try {
			const response = await fetch(`/offers/${offer.id}?/initPayment`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					paymentMethod: method,
					pickupDate: localPickupDate
				})
			});

			const result = await response.json();
			console.log('=== INIT PAYMENT RESPONSE ===');
			console.log('Full result:', result);
			console.log('Result type:', result.type);
			console.log('Result data:', result.data);

			// SvelteKit wraps action responses: { type: 'success'|'failure'|'error', data?: {...}, status?: number }
			if (result.type === 'success' && result.data) {
				paymentData = result.data as PaymentData;
				console.log('Payment data set:', paymentData);
				console.log('Payment ID:', paymentData.paymentId);

				if (method === 'iban' && paymentData.paymentMethod === 'iban') {
					// For IBAN, redirect to Zarinpal gateway immediately
					window.location.href = paymentData.zarinpalPaymentUrl;
				} else if (method === 'tether' && paymentData.paymentMethod === 'tether') {
					// For Tether, show payment instructions
					step = 'tether-send';
				}
			} else if (result.type === 'failure') {
				errorMessage = result.data?.error || 'Payment initialization failed';
				selectedMethod = null;
			} else if (result.type === 'error') {
				errorMessage = result.error?.message || 'An error occurred';
				selectedMethod = null;
			}
		} catch (err) {
			console.error('Payment error:', err);
			errorMessage = 'Failed to initialize payment. Please try again.';
			selectedMethod = null;
		} finally {
			processing = false;
		}
	};

	const handleBack = () => {
		clearMessages();
		if (step === 'tether-verify') {
			step = 'tether-send';
			transactionSent = false;
		} else {
			step = 'select';
			selectedMethod = null;
			paymentData = null;
			transactionSent = false;
			$formData.txHash = '';
		}
	};

	const handleTransactionSent = () => {
		transactionSent = true;
		step = 'tether-verify';
	};

	const handleVerifySubmit = async () => {
		if (!paymentData || paymentData.paymentMethod !== 'tether') {
			errorMessage = 'Payment data missing. Please restart the payment process.';
			return;
		}

		step = 'waiting';
	};

	$effect(() => {
		if (!show) {
			clearMessages();
			step = 'select';
			selectedMethod = null;
			paymentData = null;
			transactionSent = false;
			$formData.txHash = '';
		}
	});
</script>

<dialog class="modal z-1002" class:modal-open={show}>
	<div class="z-1002 modal-box max-w-xl rounded-lg">
		<!-- Header -->
		<div class="mb-6 flex items-start justify-between">
			<div class="flex items-center gap-3">
				{#if step !== 'select' && step !== 'success' && step !== 'waiting'}
					<button
						onclick={handleBack}
						disabled={processing || $delayed}
						class="btn btn-circle btn-ghost btn-sm"
					>
						<IconArrowLeft class="size-5" />
					</button>
				{/if}
				<div>
					<h3 class="text-xl font-semibold">
						{#if step === 'select'}
							Complete Payment
						{:else if step === 'tether-send'}
							Send Payment
						{:else if step === 'tether-verify'}
							Verify Transaction
						{:else if step === 'waiting'}
							Verifying Payment...
						{:else}
							Payment Successful!
						{/if}
					</h3>
					<p class="mt-1 text-sm opacity-60">{offer.name}</p>
				</div>
			</div>
			<button
				onclick={onClose}
				disabled={processing || step === 'waiting' || $delayed}
				class="btn btn-circle btn-ghost btn-sm"
			>
				<IconClose class="size-5" />
			</button>
		</div>

		<!-- Error Message -->
		{#if errorMessage}
			<div class="mb-6 rounded-2xl bg-error/10 p-5">
				<div class="flex gap-3">
					<IconError class="mt-0.5 size-6 text-error" />
					<div class="flex-1">
						<p class="font-medium text-error">Error</p>
						<p class="mt-1 text-sm text-error/80">{errorMessage}</p>
					</div>
				</div>
			</div>
		{/if}

		{#if step === 'select'}
			<!-- Order Summary -->
			<div class="mb-6 space-y-4">
				<div class="rounded-2xl from-primary/10 via-primary/5 to-transparent p-5">
					<div class="flex items-baseline justify-between">
						<span class="text-sm font-medium text-primary">Total Amount</span>
						<span class="text-2xl font-bold text-primary">
							{formatPrice(offer.price, offer.currency)}
						</span>
					</div>
				</div>

				{#if isRecurring}
					<div class="rounded-2xl from-secondary/10 via-secondary/5 to-transparent p-5">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="rounded-lg from-secondary/30 to-secondary/20 p-2">
									<IconCalendar class="size-5 text-secondary" />
								</div>
								<div>
									<div class="text-xs font-medium tracking-wide text-secondary/70 uppercase">
										Pickup Date
									</div>
									<div class="mt-0.5 font-semibold text-secondary">
										{formatDateDisplay(localPickupDate)}
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Payment Method Selection -->
			<div class="space-y-3">
				<h4 class="mb-4 text-sm font-medium opacity-60">Select Payment Method</h4>

				{#if businessPaymentMethods.ibanEnabled}
					<button
						onclick={() => handleMethodSelect('iban')}
						disabled={processing}
						class="to-base-50 flex w-full items-center gap-4 rounded-2xl border-2 border-base-300 from-base-100 p-5 text-left transition-all hover:border-primary hover:from-primary/5 hover:to-primary/10 disabled:opacity-50"
					>
						<div class="rounded-xl from-primary/20 to-primary/10 p-3">
							<IconBank class="size-6 text-primary" />
						</div>
						<div class="flex-1">
							<div class="font-semibold">Bank Transfer (Zarinpal)</div>
							<div class="text-sm opacity-60">Secure payment gateway</div>
						</div>
						{#if processing && selectedMethod === 'iban'}
							<span class="loading loading-sm loading-spinner text-primary"></span>
						{:else}
							<span class="text-primary">→</span>
						{/if}
					</button>
				{/if}

				{#if businessPaymentMethods.tetherEnabled}
					<button
						onclick={() => handleMethodSelect('tether')}
						disabled={processing}
						class="to-base-50 flex w-full items-center gap-4 rounded-2xl border-2 border-base-300 from-base-100 p-5 text-left transition-all hover:border-secondary hover:from-secondary/5 hover:to-secondary/10 disabled:opacity-50"
					>
						<div class="rounded-xl from-secondary/20 to-secondary/10 p-3">
							<IconWallet class="size-6 text-secondary" />
						</div>
						<div class="flex-1">
							<div class="font-semibold">Tether (USDT)</div>
							<div class="text-sm opacity-60">Cryptocurrency payment</div>
						</div>
						{#if processing && selectedMethod === 'tether'}
							<span class="loading loading-sm loading-spinner text-secondary"></span>
						{:else}
							<span class="text-secondary">→</span>
						{/if}
					</button>
				{/if}
			</div>
		{:else if step === 'tether-send' && paymentData?.paymentMethod === 'tether'}
			<!-- Tether Step 1: Send Payment -->
			<div class="space-y-6">
				<!-- Amount to Send -->
				<div class="rounded-2xl bg-linear-to-br from-secondary/20 to-secondary/10 p-6">
					<div class="mb-2 text-sm font-medium text-secondary/80">Amount to Send</div>
					<div class="text-3xl font-bold text-secondary">{paymentData.amountUsdt} USDT</div>
					<div class="mt-1 text-xs text-secondary/60">ERC-20 Network</div>
				</div>

				<!-- Wallet Address -->
				<div>
					<label class="mb-2 block text-sm font-medium text-secondary">
						Platform Wallet Address
					</label>
					<div class="flex gap-2">
						<input
							type="text"
							value={paymentData.platformWalletAddress}
							readonly
							class="input-bordered input flex-1 rounded-xl bg-base-200 font-mono text-xs focus:border-secondary"
						/>
						<button
							type="button"
							onclick={() => copyToClipboard(paymentData.platformWalletAddress, 'address')}
							class="btn btn-square rounded-xl btn-secondary"
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
				<div class="rounded-2xl bg-info/10 p-5">
					<div class="flex gap-3">
						<IconInfo class="mt-0.5 size-5 shrink-0 text-info" />
						<div class="space-y-2 text-sm">
							<p class="font-medium text-info">Payment Instructions:</p>
							<ol class="ml-5 list-decimal space-y-1.5 text-info/80">
								<li>Copy the platform wallet address above</li>
								<li>Open your crypto wallet (MetaMask, Trust Wallet, etc.)</li>
								<li>Select the ERC-20 network</li>
								<li>Send exactly <strong>{paymentData.amountUsdt} USDT</strong></li>
								<li>Wait for the transaction to be confirmed</li>
							</ol>
						</div>
					</div>
				</div>

				<!-- Warning -->
				<div class="rounded-2xl bg-warning/10 p-5">
					<div class="flex gap-3">
						<IconWarning class="mt-0.5 size-5 shrink-0 text-warning" />
						<div class="text-sm">
							<p class="font-medium text-warning">Important:</p>
							<ul class="mt-1 space-y-1 text-warning/80">
								<li>• Send only on ERC-20 network</li>
								<li>• Send the exact amount: {paymentData.amountUsdt} USDT</li>
								<li>• Do not send from an exchange wallet</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- Confirm Button -->
				<button
					type="button"
					onclick={handleTransactionSent}
					class="btn w-full rounded-xl btn-secondary"
				>
					I've Sent the Payment
					<IconSend class="size-5" />
				</button>
			</div>
		{:else if step === 'tether-verify' && paymentData?.paymentMethod === 'tether'}
			<!-- Tether Step 2: Verify Transaction -->
			<form
				method="POST"
				action="/offers/{offer.id}?/verifyTetherPayment"
				use:enhance
				onsubmit={handleVerifySubmit}
				class="space-y-6"
			>
				<input type="hidden" name="paymentId" value={paymentData.paymentId} />

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
					{:else}
						<label class="label">
							<span class="label-text-alt">
								Copy the transaction hash from your wallet after sending
							</span>
						</label>
					{/if}
				</div>

				<!-- Info Box -->
				<div class="rounded-2xl bg-info/10 p-5">
					<div class="flex gap-3">
						<IconInfo class="mt-0.5 size-5 shrink-0 text-info" />
						<div class="text-sm text-info/80">
							<p class="font-medium text-info">How to find your transaction hash:</p>
							<ul class="mt-2 space-y-1">
								<li>• In MetaMask: Click on the transaction in Activity tab</li>
								<li>• In Trust Wallet: Open transaction history</li>
								<li>• It starts with "0x" followed by 64 characters</li>
							</ul>
						</div>
					</div>
				</div>

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
		{:else if step === 'waiting'}
			<!-- Verification in Progress -->
			<div class="py-12 text-center">
				<div class="mb-6 flex justify-center">
					<span class="loading loading-lg loading-spinner text-secondary"></span>
				</div>
				<h2 class="mb-2 text-2xl font-bold">Verifying Your Payment</h2>
				<p class="text-base-content/70">
					Please wait while we confirm your transaction on the blockchain...
				</p>
				<p class="mt-4 text-sm text-base-content/50">This may take a few moments</p>
			</div>
		{:else if step === 'success'}
			<!-- Success State -->
			<div class="py-12 text-center">
				<div class="mb-6 flex justify-center">
					<div class="rounded-full bg-success/20 p-6">
						<IconSuccess class="size-16 text-success" />
					</div>
				</div>
				<h2 class="mb-2 text-2xl font-bold text-success">Payment Successful!</h2>
				<p class="text-base-content/70">Your reservation has been created. Redirecting...</p>
			</div>
		{/if}
	</div>

	<form method="dialog" class="modal-backdrop">
		<button onclick={onClose} disabled={processing || step === 'waiting' || $delayed}>close</button>
	</form>
</dialog>
