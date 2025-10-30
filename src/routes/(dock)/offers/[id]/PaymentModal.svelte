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
		onClose
	}: Props = $props();

	type PaymentStep = 'select' | 'initiated' | 'waiting' | 'success';

	let step = $state<PaymentStep>('select');
	let selectedMethod = $state<'iban' | 'tether' | null>(null);
	let processing = $state(false);
	let paymentData = $state<any>(null);
	let copiedField = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let localPickupDate = $state(pickupDate);

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

			if (result.type === 'success' && result.data) {
				paymentData = result.data;

				if (method === 'iban') {
					// For IBAN, redirect to Zarinpal gateway immediately
					window.location.href = result.data.zarinpalPaymentUrl;
				} else {
					// For Tether, show payment instructions
					step = 'initiated';
				}
			} else if (result.type === 'failure') {
				errorMessage = result.data?.error || 'Payment initialization failed';
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
		step = 'select';
		selectedMethod = null;
		paymentData = null;
	};

	const handleConfirmTetherPayment = async () => {
		clearMessages();
		processing = true;

		try {
			const txHash = (document.getElementById('tetherTxHash') as HTMLInputElement)?.value;

			if (!txHash || !txHash.trim()) {
				errorMessage = 'Please enter the transaction hash';
				processing = false;
				return;
			}

			step = 'waiting';

			const response = await fetch(`/offers/${offer.id}?/verifyTetherPayment`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					paymentId: paymentData.paymentId,
					txHash: txHash.trim()
				})
			});

			const result = await response.json();

			if (result.type === 'success') {
				step = 'success';
				setTimeout(() => {
					window.location.href = `/reservations/${result.data.reservationId}`;
				}, 2000);
			} else if (result.type === 'failure') {
				step = 'initiated';
				errorMessage = result.data?.error || 'Payment verification failed';
			}
		} catch (err) {
			console.error('Verification error:', err);
			step = 'initiated';
			errorMessage = 'Failed to verify payment. Please try again.';
		} finally {
			processing = false;
		}
	};

	$effect(() => {
		if (!show) {
			clearMessages();
			step = 'select';
			selectedMethod = null;
			paymentData = null;
		}
	});
</script>

<dialog class="modal z-1002" class:modal-open={show}>
	<div class="z-1002 modal-box max-w-xl rounded-lg">
		<!-- Header -->
		<div class="mb-6 flex items-start justify-between">
			<div class="flex items-center gap-3">
				{#if step !== 'select' && step !== 'success'}
					<button
						onclick={handleBack}
						disabled={processing}
						class="btn btn-circle btn-ghost btn-sm"
					>
						<IconArrowLeft class="size-5" />
					</button>
				{/if}
				<div>
					<h3 class="text-xl font-semibold">
						{#if step === 'select'}
							Complete Payment
						{:else if step === 'initiated'}
							Payment Instructions
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
				disabled={processing || step === 'waiting'}
				class="btn btn-circle btn-ghost btn-sm"
			>
				<IconClose class="size-5" />
			</button>
		</div>

		<!-- Error Message -->
		{#if errorMessage}
			<div class="mb-6 rounded-2xl bg-error/10 p-5">
				<div class="flex gap-3">
					<IconError class="mt-0.5 size-6 flex-shrink-0 text-error" />
					<div class="flex-1">
						<p class="font-medium text-error">Error</p>
						<p class="mt-1 text-sm text-error/80">{errorMessage}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Order Summary -->
		<div class="mb-6 space-y-4">
			<div class="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
				<div class="flex items-baseline justify-between">
					<span class="text-sm font-medium text-primary">Total Amount</span>
					<span class="text-2xl font-bold text-primary">
						{formatPrice(offer.price, offer.currency)}
					</span>
				</div>
			</div>

			{#if isRecurring}
				<div
					class="rounded-2xl bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent p-5"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-gradient-to-br from-secondary/30 to-secondary/20 p-2">
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

		{#if step === 'select'}
			<!-- Payment Method Selection -->
			<div class="space-y-3">
				<h4 class="mb-4 text-sm font-medium opacity-60">Select Payment Method</h4>

				{#if businessPaymentMethods.ibanEnabled}
					<button
						onclick={() => handleMethodSelect('iban')}
						disabled={processing}
						class="to-base-50 flex w-full items-center gap-4 rounded-2xl border-2 border-base-300 bg-gradient-to-br from-base-100 p-5 text-left transition-all hover:border-primary hover:from-primary/5 hover:to-primary/10 disabled:opacity-50"
					>
						<div class="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-3">
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
						class="to-base-50 flex w-full items-center gap-4 rounded-2xl border-2 border-base-300 bg-gradient-to-br from-base-100 p-5 text-left transition-all hover:border-secondary hover:from-secondary/5 hover:to-secondary/10 disabled:opacity-50"
					>
						<div class="rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 p-3">
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

				<div class="mt-6 rounded-2xl bg-info/10 p-5">
					<div class="flex gap-3">
						<IconInfo class="mt-0.5 size-5 flex-shrink-0 text-info" />
						<div class="text-sm">
							<p class="font-medium text-info">Secure Payment Process</p>
							<ol class="mt-2 ml-4 list-decimal space-y-1 opacity-80">
								<li>Payment goes to our secure platform wallet</li>
								<li>Your reservation is created immediately</li>
								<li>We transfer the business portion automatically</li>
								<li>You receive your surprise bag at pickup time</li>
							</ol>
						</div>
					</div>
				</div>
			</div>
		{:else if step === 'initiated' && selectedMethod === 'tether'}
			<!-- Tether Payment Instructions -->
			<div class="space-y-6">
				<div class="rounded-2xl bg-gradient-to-br from-warning/10 to-warning/5 p-5">
					<div class="flex gap-3">
						<IconWarning class="mt-0.5 size-5 flex-shrink-0 text-warning" />
						<div class="text-sm">
							<p class="font-medium">Important Instructions</p>
							<p class="mt-1 opacity-80">
								Send exactly <span class="font-semibold text-secondary"
									>{paymentData.amountUsdt} USDT</span
								>
								to the platform wallet on the Ethereum network (ERC-20). Double-check the address before
								sending.
							</p>
						</div>
					</div>
				</div>

				<div>
					<label class="mb-2 block text-sm font-medium text-secondary">
						Platform Wallet Address (ERC-20)
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

				<div class="rounded-2xl bg-linear-to-br from-secondary/10 to-secondary/5 p-5">
					<p class="mb-3 text-sm font-medium text-secondary">Payment Steps:</p>
					<ol class="ml-5 list-decimal space-y-2 text-sm opacity-80">
						<li>Copy the platform wallet address above</li>
						<li>Open your crypto wallet (MetaMask, Trust Wallet, etc.)</li>
						<li>Send exactly {paymentData.amountUsdt} USDT on ERC-20 network</li>
						<li>Copy the transaction hash from your wallet</li>
						<li>Paste it below and click "Verify Payment"</li>
					</ol>
				</div>

				<div>
					<label for="tetherTxHash" class="mb-2 block text-sm font-medium">
						Transaction Hash
					</label>
					<input
						id="tetherTxHash"
						type="text"
						placeholder="0x..."
						disabled={processing}
						class="input-bordered input w-full rounded-xl bg-base-200 font-mono text-sm"
					/>
					<p class="mt-2 text-xs opacity-50">Paste the transaction hash from your wallet</p>
				</div>

				<button
					type="button"
					onclick={handleConfirmTetherPayment}
					disabled={processing}
					class="btn w-full rounded-xl btn-secondary"
				>
					{#if processing}
						<span class="loading loading-sm loading-spinner"></span>
						Verifying...
					{:else}
						Verify Payment
						<IconArrowRight class="size-5" />
					{/if}
				</button>
			</div>
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
		<button onclick={onClose} disabled={processing || step === 'waiting'}>close</button>
	</form>
</dialog>
