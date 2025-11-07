<!-- src/routes/(dock)/offers/[id]/PaymentModal.svelte -->
<script lang="ts">
	import IconClose from '~icons/fluent/dismiss-24-regular';
	import IconBank from '~icons/fluent/building-bank-24-regular';
	import IconWallet from '~icons/fluent/wallet-24-regular';

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
	import { txHashSchema, initPaymentSchema } from './schema';
	import type { TxHashSchema, InitPaymentSchema } from './schema';
	import { formatDate, formatPrice } from '$lib/util';
	import CollapsibleHelp from '$lib/components/CollapsibleHelp.svelte';

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
		success: true;
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
		success: true;
		paymentId: string;
		paymentMethod: 'tether';
		platformWalletAddress: string;
		amountUsdt: string;
		pickupDate: string;
		offerName: string;
	}

	type PaymentData = IbanPaymentData | TetherPaymentData;

	let step = $state<PaymentStep>('select');
	let selectedMethod = $state<'iban' | 'tether' | null>(null);
	let paymentData = $state<PaymentData | null>(null);
	let copiedField = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let localPickupDate = $state(pickupDate);
	let transactionSent = $state(false);

	// Init Payment Form
	const initPaymentInitialData: InitPaymentSchema = {
		paymentMethod: 'iban',
		pickupDate: pickupDate
	};

	const initPaymentForm = superForm(initPaymentInitialData, {
		validators: valibot(initPaymentSchema),
		resetForm: false,
		onSubmit: () => {
			errorMessage = null;
		},
		onResult: async ({ result }) => {
			console.log('=== INIT PAYMENT RESULT ===');
			console.log('Result:', result);

			if (result.type === 'success') {
				const data = result.data as any;
				console.log('Success data:', data);

				if (data?.success && data?.paymentMethod) {
					paymentData = data as PaymentData;

					if (data.paymentMethod === 'iban' && 'zarinpalPaymentUrl' in data) {
						// Redirect to Zarinpal
						window.location.href = data.zarinpalPaymentUrl;
					} else if (data.paymentMethod === 'tether') {
						// Show tether payment instructions
						step = 'tether-send';
					}
				} else {
					errorMessage = 'Invalid payment response';
					selectedMethod = null;
				}
			} else if (result.type === 'failure') {
				const data = result.data as any;
				console.log('Failure data:', data);
				// SuperForms sets the error on the form, check for form-level errors
				if (data?.form?.errors?.['']) {
					errorMessage = Array.isArray(data.form.errors[''])
						? data.form.errors[''][0]
						: data.form.errors[''];
				} else {
					errorMessage = 'Payment initialization failed';
				}
				selectedMethod = null;
			} else if (result.type === 'error') {
				console.log('Error:', result.error);
				errorMessage = result.error?.message || 'An error occurred';
				selectedMethod = null;
			}
		}
	});

	const {
		form: initPaymentFormData,
		errors: initPaymentErrors,
		enhance: initPaymentEnhance,
		delayed: initPaymentDelayed
	} = initPaymentForm;

	// Verify Transaction Form
	const verifyInitialData: TxHashSchema = {
		txHash: '',
		paymentId: '' // Initialize empty, will be set when payment data is available
	};

	const verifyForm = superForm(verifyInitialData, {
		validators: valibot(txHashSchema),
		resetForm: false,
		onSubmit: () => {
			errorMessage = null;
			step = 'waiting';
		},
		onResult: async ({ result }) => {
			console.log('=== VERIFY FORM RESULT ===');
			console.log('Result:', result);

			if (result.type === 'success') {
				const data = result.data as any;
				console.log('Success data:', data);

				if (data?.success && data?.reservationId) {
					step = 'success';
					setTimeout(() => {
						window.location.href = `/reservations/${data.reservationId}`;
					}, 2000);
				} else {
					errorMessage = 'Verification succeeded but no reservation ID received';
					step = 'tether-verify';
				}
			} else if (result.type === 'failure') {
				const data = result.data as any;
				console.log('Failure data:', data);
				// SuperForms sets the error on the form, check for form-level errors
				if (data?.form?.errors?.['']) {
					errorMessage = Array.isArray(data.form.errors[''])
						? data.form.errors[''][0]
						: data.form.errors[''];
				} else if (data?.form?.errors?.txHash) {
					errorMessage = Array.isArray(data.form.errors.txHash)
						? data.form.errors.txHash[0]
						: data.form.errors.txHash;
				} else {
					errorMessage = 'Payment verification failed';
				}
				step = 'tether-verify';
			} else if (result.type === 'error') {
				console.log('Error:', result.error);
				errorMessage = result.error?.message || 'An error occurred';
				step = 'tether-verify';
			}
		}
	});

	const {
		form: verifyFormData,
		errors: verifyErrors,
		enhance: verifyEnhance,
		delayed: verifyDelayed
	} = verifyForm;

	// Add this effect to set paymentId when paymentData is available
	$effect(() => {
		if (paymentData?.paymentMethod === 'tether') {
			$verifyFormData.paymentId = paymentData.paymentId;
		}
	});

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

	const handleMethodSelect = (method: 'iban' | 'tether') => {
		clearMessages();
		selectedMethod = method;
		$initPaymentFormData.paymentMethod = method;
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
			$verifyFormData.txHash = '';
		}
	};

	const handleTransactionSent = () => {
		transactionSent = true;
		step = 'tether-verify';
	};

	$effect(() => {
		if (!show) {
			clearMessages();
			step = 'select';
			selectedMethod = null;
			paymentData = null;
			transactionSent = false;
			$verifyFormData.txHash = '';
		}
	});

	const isProcessing = $derived($initPaymentDelayed || $verifyDelayed);
</script>

<dialog class="modal z-1002" class:modal-open={show}>
	<div class="z-1002 modal-box max-w-xl rounded-lg">
		<!-- Header -->
		<div class="mb-6 flex items-start justify-between">
			<div class="flex items-center gap-3">
				{#if step !== 'select' && step !== 'success' && step !== 'waiting'}
					<button
						onclick={handleBack}
						disabled={isProcessing}
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
				disabled={isProcessing || step === 'waiting'}
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
		{:else if step === 'select' && $initPaymentErrors['']}
			<div class="mb-6 rounded-2xl bg-error/10 p-5">
				<div class="flex gap-3">
					<IconError class="mt-0.5 size-6 text-error" />
					<div class="flex-1">
						<p class="font-medium text-error">Error</p>
						<p class="mt-1 text-sm text-error/80">
							{Array.isArray($initPaymentErrors[''])
								? $initPaymentErrors[''][0]
								: $initPaymentErrors['']}
						</p>
					</div>
				</div>
			</div>
		{:else if step === 'tether-verify' && $verifyErrors['']}
			<div class="mb-6 rounded-2xl bg-error/10 p-5">
				<div class="flex gap-3">
					<IconError class="mt-0.5 size-6 text-error" />
					<div class="flex-1">
						<p class="font-medium text-error">Error</p>
						<p class="mt-1 text-sm text-error/80">
							{Array.isArray($verifyErrors['']) ? $verifyErrors[''][0] : $verifyErrors['']}
						</p>
					</div>
				</div>
			</div>
		{/if}

		{#if step === 'select'}
			<!-- Order Summary -->
			<div class="mb-6 space-y-4">
				<div class="rounded-2xl p-5">
					<div class="flex items-baseline justify-between">
						<span class="text-sm font-medium text-primary">Total Amount</span>
						<span class="text-2xl font-bold text-primary">
							{formatPrice(offer.price, offer.currency)}
						</span>
					</div>
				</div>

				{#if isRecurring}
					<div class="rounded-2xl p-5">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="rounded-lg bg-linear-to-br from-secondary/30 to-secondary/20 p-2">
									<IconCalendar class="size-5 text-secondary" />
								</div>
								<div>
									<div class="text-xs font-medium tracking-wide text-secondary/70 uppercase">
										Pickup Date
									</div>
									<div class="mt-0.5 font-semibold text-secondary">
										{localPickupDate}
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Payment Method Selection Form -->
			<form
				method="POST"
				action="/offers/{offer.id}?/initPayment"
				use:initPaymentEnhance
				class="space-y-3"
			>
				<input type="hidden" name="pickupDate" value={$initPaymentFormData.pickupDate} />
				<input type="hidden" name="paymentMethod" value={$initPaymentFormData.paymentMethod} />

				<h4 class="mb-4 text-sm font-medium opacity-60">Select Payment Method</h4>

				{#if businessPaymentMethods.ibanEnabled}
					<button
						type="submit"
						onclick={() => handleMethodSelect('iban')}
						disabled={isProcessing}
						class="to-base-50 flex w-full items-center gap-4 rounded-2xl border-2 border-base-300 bg-linear-to-br from-base-100 p-5 text-left transition-all hover:border-primary hover:from-primary/5 hover:to-primary/10 disabled:opacity-50"
					>
						<div class="rounded-xl bg-linear-to-br from-primary/20 to-primary/10 p-3">
							<IconBank class="size-6 text-primary" />
						</div>
						<div class="flex-1">
							<div class="font-semibold">Bank Transfer (Zarinpal)</div>
							<div class="text-sm opacity-60">Secure payment gateway</div>
						</div>
						{#if isProcessing && selectedMethod === 'iban'}
							<span class="loading loading-sm loading-spinner text-primary"></span>
						{:else}
							<span class="text-primary">→</span>
						{/if}
					</button>
				{/if}

				{#if businessPaymentMethods.tetherEnabled}
					<button
						type="submit"
						onclick={() => handleMethodSelect('tether')}
						disabled={isProcessing}
						class="to-base-50 flex w-full items-center gap-4 rounded-2xl border-2 border-base-300 bg-linear-to-br from-base-100 p-5 text-left transition-all hover:border-secondary hover:from-secondary/5 hover:to-secondary/10 disabled:opacity-50"
					>
						<div class="rounded-xl bg-linear-to-br from-secondary/20 to-secondary/10 p-3">
							<IconWallet class="size-6 text-secondary" />
						</div>
						<div class="flex-1">
							<div class="font-semibold">Tether (USDT)</div>
							<div class="text-sm opacity-60">Cryptocurrency payment</div>
						</div>
						{#if isProcessing && selectedMethod === 'tether'}
							<span class="loading loading-sm loading-spinner text-secondary"></span>
						{:else}
							<span class="text-secondary">→</span>
						{/if}
					</button>
				{/if}
			</form>
		{:else if step === 'tether-send' && paymentData?.paymentMethod === 'tether'}
			<!-- Tether Step 1: Send Payment -->
			<script lang="ts">
				import CollapsibleHelp from './CollapsibleHelp.svelte';
				// ... your other imports
			</script>

			<div class="space-y-6">
				<!-- Amount to Send -->
				<div class="rounded-lg border-2 border-secondary/20 bg-secondary/5 p-6">
					<div class="mb-2 text-sm font-medium text-secondary/70">Amount to Send</div>
					<div class="text-3xl font-bold text-secondary">{paymentData.amountUsdt} USDT</div>
					<div class="mt-1 text-xs text-secondary/50">ERC-20 Network</div>
				</div>

				<!-- Wallet Address -->
				<div>
					<label class="mb-2 block text-sm font-medium text-base-content">
						Platform Wallet Address
					</label>
					<div class="flex gap-2">
						<input
							type="text"
							value={paymentData.platformWalletAddress}
							readonly
							class="input-bordered input flex-1 rounded-lg bg-base-200 font-mono text-xs"
						/>
						<button
							type="button"
							onclick={() => copyToClipboard(paymentData.platformWalletAddress, 'address')}
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

				<!-- Instructions (Collapsible) -->
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
							<span
								>Send exactly <strong class="text-secondary">{paymentData.amountUsdt} USDT</strong
								></span
							>
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
					onclick={handleTransactionSent}
					class="btn w-full rounded-lg btn-secondary"
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
				use:verifyEnhance
				class="space-y-6"
			>
				<!-- Remove this line - paymentId is now in the schema -->
				<!-- <input type="hidden" name="paymentId" value={paymentData.paymentId} /> -->

				<!-- Hidden input for paymentId (bound to form data) -->
				<input type="hidden" name="paymentId" bind:value={$verifyFormData.paymentId} />

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
						bind:value={$verifyFormData.txHash}
						disabled={$verifyDelayed}
						class="input-bordered input rounded-xl bg-base-200 font-mono text-sm"
						class:input-error={$verifyErrors.txHash}
					/>
					{#if $verifyErrors.txHash}
						<label class="label">
							<span class="label-text-alt text-error">{$verifyErrors.txHash}</span>
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
				<button type="submit" disabled={$verifyDelayed} class="btn w-full rounded-xl btn-secondary">
					{#if $verifyDelayed}
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
		<button onclick={onClose} disabled={isProcessing || step === 'waiting'}>close</button>
	</form>
</dialog>
