<!-- src/lib/components/PaymentModal.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconClose from '~icons/fluent/dismiss-24-regular';
	import IconBank from '~icons/fluent/building-bank-24-regular';
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconWarning from '~icons/fluent/warning-24-regular';
	import IconError from '~icons/fluent/error-circle-24-regular';
	import IconSuccess from '~icons/fluent/checkmark-circle-24-filled';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import { schedulePickupNotifications } from '$lib/client/schedulePickupNotifications';

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

	let selectedMethod = $state<'iban' | 'tether' | null>(null);
	let processing = $state(false);
	let paymentDetails = $state<any>(null);
	let copiedField = $state<string | null>(null);
	let transactionReference = $state('');
	let showPaymentForm = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let localPickupDate = $state(pickupDate);

	// Keep local date in sync with prop
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
		successMessage = null;
	};

	const handleMethodSelect = async (method: 'iban' | 'tether') => {
		clearMessages();
		selectedMethod = method;
		processing = true;

		const formData = new FormData();
		formData.append('paymentMethod', method);
		formData.append('pickupDate', localPickupDate);

		try {
			const response = await fetch(`/offers/${offer.id}?/initPayment`, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success' && result.data) {
				paymentDetails = result.data;
				showPaymentForm = true;
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
		selectedMethod = null;
		showPaymentForm = false;
		paymentDetails = null;
		transactionReference = '';
	};

	const handleConfirmPayment = async () => {
		if (!transactionReference.trim()) {
			errorMessage = 'Please enter the transaction reference';
			return;
		}

		clearMessages();
		processing = true;
		const formData = new FormData();
		formData.append('paymentId', paymentDetails.paymentId);
		formData.append('transactionReference', transactionReference);

		try {
			const response = await fetch(`/offers/${offer.id}?/confirmPayment`, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success') {
				// Payment successful - schedule pickup notifications
				try {
					const notificationResult = await schedulePickupNotifications({
						reservationId: result.data.reservationId,
						pickupDate: localPickupDate,
						offerName: offer.name,
						locationName: locationName
					});

					if (notificationResult.success) {
						console.log(
							`Scheduled ${notificationResult.scheduledCount} notification(s) for pickup`
						);
						successMessage = `Payment confirmed! ${notificationResult.scheduledCount} pickup reminder(s) scheduled.`;
					} else {
						console.warn('Failed to schedule notifications:', notificationResult.error);
						successMessage =
							'Payment confirmed! Your reservation has been created. (Reminders could not be scheduled)';
					}
				} catch (notifError) {
					// Don't fail the whole payment if notification scheduling fails
					console.error('Notification scheduling error:', notifError);
					successMessage =
						'Payment confirmed! Your reservation has been created. (Reminders could not be scheduled)';
				}

				// Redirect after a short delay
				setTimeout(() => {
					window.location.href = `/reservations/${result.data.reservationId}`;
				}, 2000);
			} else if (result.type === 'failure') {
				errorMessage = result.data?.error || 'Payment confirmation failed';
			}
		} catch (err) {
			console.error('Confirmation error:', err);
			errorMessage = 'Failed to confirm payment. Please try again.';
		} finally {
			processing = false;
		}
	};

	$effect(() => {
		if (!show) {
			clearMessages();
			selectedMethod = null;
			showPaymentForm = false;
			paymentDetails = null;
			transactionReference = '';
		}
	});
</script>

<dialog class="modal" class:modal-open={show}>
	<div class="modal-box max-w-xl rounded-lg">
		<!-- Header -->
		<div class="mb-6 flex items-start justify-between">
			<div class="flex items-center gap-3">
				{#if selectedMethod}
					<button
						onclick={handleBack}
						disabled={processing}
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
			<button onclick={onClose} disabled={processing} class="btn btn-circle btn-ghost btn-sm">
				<IconClose class="size-5" />
			</button>
		</div>

		<!-- Success Message -->
		{#if successMessage}
			<div class="mb-6 rounded-2xl bg-success/10 p-5">
				<div class="flex gap-3">
					<IconSuccess class="mt-0.5 size-6 shrink-0 text-success" />
					<div class="flex-1">
						<p class="font-medium text-success">Success!</p>
						<p class="mt-1 text-sm text-success/80">{successMessage}</p>
						<p class="mt-2 text-xs text-success/60">Redirecting to your reservation...</p>
					</div>
				</div>
			</div>
		{/if}

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
			<!-- Price -->
			<div class="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
				<div class="flex items-baseline justify-between">
					<span class="text-sm font-medium text-primary">Total Amount</span>
					<span class="text-2xl font-bold text-primary">
						{formatPrice(offer.price, offer.currency)}
					</span>
				</div>
			</div>

			<!-- Pickup Date -->
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

		{#if !selectedMethod}
			<!-- Payment Method Selection -->
			<div class="mb-6 space-y-3">
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
							<div class="font-semibold">Bank Transfer</div>
							<div class="text-sm opacity-60">Shetab card payment</div>
						</div>
						<span class="text-primary">→</span>
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
							<div class="text-sm opacity-60">Cryptocurrency wallet</div>
						</div>
						<span class="text-secondary">→</span>
					</button>
				{/if}
			</div>
		{:else if processing && !paymentDetails}
			<!-- Loading State -->
			<div class="flex flex-col items-center gap-4 py-12">
				<span class="loading loading-lg loading-spinner text-primary"></span>
				<p class="opacity-60">Initializing payment...</p>
			</div>
		{:else if showPaymentForm && paymentDetails}
			<!-- Payment Form -->
			<div class="space-y-6">
				{#if paymentDetails.paymentMethod === 'iban'}
					<!-- Bank Transfer Instructions -->
					<div class="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-5">
						<div class="flex gap-3">
							<IconInfo class="mt-0.5 size-5 flex-shrink-0 text-primary" />
							<div class="text-sm">
								<p class="font-medium">Bank Transfer Instructions</p>
								<p class="mt-1 opacity-70">
									Transfer the exact amount to the card number below and include the reference.
								</p>
							</div>
						</div>
					</div>

					<div>
						<label class="mb-2 block text-sm font-medium text-primary">Shetab Card Number</label>
						<div class="flex gap-2">
							<input
								type="text"
								value={paymentDetails.ibanNumber}
								readonly
								class="input-bordered input flex-1 rounded-xl bg-base-200 font-mono text-sm focus:border-primary"
							/>
							<button
								type="button"
								onclick={() => copyToClipboard(paymentDetails.ibanNumber, 'iban')}
								class="btn btn-square rounded-xl btn-primary"
							>
								{#if copiedField === 'iban'}
									<IconCheckmark class="size-5" />
								{:else}
									<IconCopy class="size-5" />
								{/if}
							</button>
						</div>
					</div>

					<div>
						<label class="mb-2 block text-sm font-medium text-primary">Payment Reference</label>
						<div class="flex gap-2">
							<input
								type="text"
								value={paymentDetails.reference}
								readonly
								class="input-bordered input flex-1 rounded-xl bg-base-200 font-mono focus:border-primary"
							/>
							<button
								type="button"
								onclick={() => copyToClipboard(paymentDetails.reference, 'reference')}
								class="btn btn-square rounded-xl btn-primary"
							>
								{#if copiedField === 'reference'}
									<IconCheckmark class="size-5" />
								{:else}
									<IconCopy class="size-5" />
								{/if}
							</button>
						</div>
						<p class="mt-2 text-xs opacity-50">Include this in your transfer description</p>
					</div>
				{:else if paymentDetails.paymentMethod === 'tether'}
					<!-- Tether Transfer Instructions -->
					<div class="rounded-2xl bg-gradient-to-br from-warning/10 to-warning/5 p-5">
						<div class="flex gap-3">
							<IconWarning class="mt-0.5 size-5 flex-shrink-0 text-warning" />
							<div class="text-sm">
								<p class="font-medium">Important</p>
								<p class="mt-1 opacity-80">
									Send exactly <span class="font-semibold text-secondary">
										{paymentDetails.amount} USDT</span
									> on the Ethereum network (ERC-20). Double-check the address.
								</p>
							</div>
						</div>
					</div>

					<div>
						<label class="mb-2 block text-sm font-medium text-secondary">
							Wallet Address (ERC-20)
						</label>
						<div class="flex gap-2">
							<input
								type="text"
								value={paymentDetails.tetherAddress}
								readonly
								class="input-bordered input flex-1 rounded-xl bg-base-200 font-mono text-xs focus:border-secondary"
							/>
							<button
								type="button"
								onclick={() => copyToClipboard(paymentDetails.tetherAddress, 'address')}
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

					<div class="rounded-2xl bg-gradient-to-br from-secondary/10 to-secondary/5 p-5">
						<p class="mb-3 text-sm font-medium text-secondary">Steps:</p>
						<ol class="ml-5 list-decimal space-y-2 text-sm opacity-80">
							<li>Copy the wallet address above</li>
							<li>Open your crypto wallet (MetaMask, Trust Wallet, etc.)</li>
							<li>Send exactly {paymentDetails.amount} USDT on ERC-20 network</li>
							<li>Copy the transaction hash and paste it below</li>
						</ol>
					</div>
				{/if}

				<!-- Transaction Reference Input -->
				<div>
					<label class="mb-2 block text-sm font-medium">
						{paymentDetails.paymentMethod === 'iban'
							? 'Your Transaction Reference'
							: 'Transaction Hash'}
					</label>
					<input
						type="text"
						bind:value={transactionReference}
						placeholder={paymentDetails.paymentMethod === 'iban' ? 'Enter reference' : '0x...'}
						disabled={processing || !!successMessage}
						class="input-bordered input w-full rounded-xl bg-base-200 font-mono text-sm"
					/>
					<p class="mt-2 text-xs opacity-50">
						{paymentDetails.paymentMethod === 'iban'
							? 'Enter the reference from your bank transfer'
							: 'Paste the transaction hash from your wallet'}
					</p>
				</div>

				<button
					type="button"
					onclick={handleConfirmPayment}
					disabled={processing || !transactionReference.trim() || !!successMessage}
					class="btn w-full rounded-xl"
					class:btn-primary={paymentDetails.paymentMethod === 'iban'}
					class:btn-secondary={paymentDetails.paymentMethod === 'tether'}
				>
					{#if processing}
						<span class="loading loading-sm loading-spinner"></span>
						Verifying...
					{:else if successMessage}
						<IconCheckmark class="size-5" />
						Payment Confirmed
					{:else}
						Confirm Payment
					{/if}
				</button>
			</div>
		{/if}
	</div>

	<form method="dialog" class="modal-backdrop">
		<button onclick={onClose} disabled={processing}>close</button>
	</form>
</dialog>
