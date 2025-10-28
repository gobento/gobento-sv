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
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
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
		locationName?: string;
		onClose: () => void;
	}

	let { show, offer, businessPaymentMethods, pickupDate, locationName, onClose }: Props = $props();

	let selectedMethod = $state<'iban' | 'tether' | null>(null);
	let processing = $state(false);
	let paymentDetails = $state<any>(null);
	let copiedField = $state<string | null>(null);
	let transactionReference = $state('');
	let showPaymentForm = $state(false);

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

	const handleMethodSelect = async (method: 'iban' | 'tether') => {
		selectedMethod = method;
		processing = true;

		const formData = new FormData();
		formData.append('paymentMethod', method);
		formData.append('pickupDate', pickupDate);

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
				alert(result.data?.error || 'Payment initialization failed');
				selectedMethod = null;
			}
		} catch (err) {
			console.error('Payment error:', err);
			alert('Failed to initialize payment');
			selectedMethod = null;
		} finally {
			processing = false;
		}
	};

	const handleBack = () => {
		selectedMethod = null;
		showPaymentForm = false;
		paymentDetails = null;
		transactionReference = '';
	};

	const handleConfirmPayment = async () => {
		if (!transactionReference.trim()) {
			alert('Please enter the transaction reference');
			return;
		}

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
						pickupDate: pickupDate,
						offerName: offer.name,
						locationName: locationName
					});

					if (notificationResult.success) {
						console.log(
							`Scheduled ${notificationResult.scheduledCount} notification(s) for pickup`
						);
					} else {
						console.warn('Failed to schedule notifications:', notificationResult.error);
					}
				} catch (notifError) {
					// Don't fail the whole payment if notification scheduling fails
					console.error('Notification scheduling error:', notifError);
				}

				alert('Payment confirmed! Your reservation has been created.');
				window.location.reload();
			} else if (result.type === 'failure') {
				alert(result.data?.error || 'Payment confirmation failed');
			}
		} catch (err) {
			console.error('Confirmation error:', err);
			alert('Failed to confirm payment');
		} finally {
			processing = false;
		}
	};

	$effect(() => {
		if (!show) {
			selectedMethod = null;
			showPaymentForm = false;
			paymentDetails = null;
			transactionReference = '';
		}
	});
</script>

<dialog class="modal" class:modal-open={show}>
	<div class="modal-box max-w-xl rounded-3xl">
		<!-- Header -->
		<div class="mb-8 flex items-start justify-between">
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

		<!-- Price Display -->
		<div class="mb-8 rounded-2xl bg-primary/10 p-6">
			<div class="flex items-baseline justify-between">
				<span class="text-sm font-medium text-primary">Total Amount</span>
				<span class="text-3xl font-semibold text-primary">
					{formatPrice(offer.price, offer.currency)}
				</span>
			</div>
			<div class="mt-3 flex items-center justify-between text-xs opacity-50">
				<span>Pickup Date</span>
				<span class="font-medium">
					{new Date(pickupDate).toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
						year: 'numeric'
					})}
				</span>
			</div>
		</div>

		{#if !selectedMethod}
			<!-- Payment Method Selection -->
			<div class="mb-6 space-y-3">
				<h4 class="mb-4 text-sm font-medium opacity-60">Select Payment Method</h4>

				{#if businessPaymentMethods.ibanEnabled}
					<button
						onclick={() => handleMethodSelect('iban')}
						disabled={processing}
						class="flex w-full items-center gap-4 rounded-2xl border-2 border-base-300 p-5 text-left transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50"
					>
						<div class="rounded-xl bg-primary/10 p-3">
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
						class="flex w-full items-center gap-4 rounded-2xl border-2 border-base-300 p-5 text-left transition-all hover:border-secondary hover:bg-secondary/5 disabled:opacity-50"
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
					<div class="rounded-2xl bg-primary/10 p-5">
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
					<div class="rounded-2xl bg-warning/10 p-5">
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

					<div class="rounded-2xl bg-secondary/10 p-5">
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
						disabled={processing}
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
					disabled={processing || !transactionReference.trim()}
					class="btn w-full rounded-xl"
					class:btn-primary={paymentDetails.paymentMethod === 'iban'}
					class:btn-secondary={paymentDetails.paymentMethod === 'tether'}
				>
					{#if processing}
						<span class="loading loading-sm loading-spinner"></span>
						Verifying...
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
