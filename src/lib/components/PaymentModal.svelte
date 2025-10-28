<!-- src/lib/components/PaymentModal.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconClose from '~icons/fluent/dismiss-24-regular';
	import IconBank from '~icons/fluent/building-bank-24-regular';
	import FluentPayment24Regular from '~icons/fluent/payment-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconCheck from '~icons/fluent/checkmark-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';

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
		onClose: () => void;
	}

	let { show, offer, businessPaymentMethods, pickupDate, onClose }: Props = $props();

	let selectedMethod = $state<'iban' | 'tether'>(businessPaymentMethods.preferredMethod);
	let processing = $state(false);
	let paymentDetails = $state<any>(null);
	let copiedField = $state<string | null>(null);
	let transactionReference = $state('');

	const formatPrice = (price: number, currency: string) => {
		return price;

		if (currency === 'USDT') {
			return `${price.toFixed(2)} USDT`;
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

	const handleInitPayment = async () => {
		processing = true;
		const formData = new FormData();
		formData.append('paymentMethod', selectedMethod);
		formData.append('pickupDate', pickupDate);

		try {
			const response = await fetch(`/offers/${offer.id}?/initPayment`, {
				method: 'POST',
				body: formData
			});

			console.log('initPayment response:', response);

			const result = await response.json();

			console.log('initPayment result:', result);

			if (result.type === 'success' && result.data) {
				paymentDetails = result.data;
			} else if (result.type === 'failure') {
				alert(result.data?.error || 'Payment initialization failed');
				onClose();
			}
		} catch (err) {
			console.error('Payment error:', err);
			alert('Failed to initialize payment');
			onClose();
		} finally {
			processing = false;
		}
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
		if (show && !paymentDetails) {
			handleInitPayment();
		}
		if (!show) {
			paymentDetails = null;
			transactionReference = '';
		}
	});
</script>

{#if show}
	<div class="modal-open modal">
		<div class="modal-box max-w-2xl">
			<!-- Header -->
			<div class="mb-6 flex items-start justify-between">
				<div>
					<h3 class="text-2xl font-semibold">Complete Payment</h3>
					<p class="mt-1 text-base text-base-content/60">{offer.name}</p>
				</div>
				<button
					type="button"
					class="btn btn-circle btn-ghost btn-sm"
					onclick={onClose}
					disabled={processing}
				>
					<IconClose class="size-5" />
				</button>
			</div>

			{#if processing && !paymentDetails}
				<div class="flex flex-col items-center gap-4 py-12">
					<span class="loading loading-lg loading-spinner text-primary"></span>
					<p class="text-base-content/60">Initializing payment...</p>
				</div>
			{:else if paymentDetails}
				<div class="space-y-6">
					<!-- Amount -->
					<div class="rounded-lg border border-base-300 bg-base-100 p-5">
						<p class="mb-2 text-sm text-base-content/60">Amount to Pay</p>
						<p class="text-3xl font-bold text-success">
							{formatPrice(paymentDetails.amount, paymentDetails.currency)}
						</p>
					</div>

					<!-- Pickup Date -->
					<div class="rounded-lg border border-base-300 bg-base-100 p-5">
						<div class="mb-3 flex items-center gap-2">
							<IconCalendar class="size-5 text-primary" />
							<h4 class="text-lg font-semibold">Pickup Date</h4>
						</div>
						<p class="text-xl font-semibold">
							{new Date(paymentDetails.pickupDate).toLocaleDateString('de-DE', {
								weekday: 'long',
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</p>
					</div>

					<!-- Payment Instructions -->
					{#if paymentDetails.paymentMethod === 'iban'}
						<div class="rounded-lg border border-base-300 bg-base-100 p-5">
							<div class="mb-4 flex items-center gap-2">
								<IconBank class="size-5 text-primary" />
								<h4 class="text-lg font-semibold">Bank Transfer Details</h4>
							</div>

							<div class="space-y-4">
								<!-- IBAN -->
								<div class="space-y-2">
									<label class="text-sm text-base-content/60">Shetab Card Number</label>
									<div class="flex gap-2">
										<input
											type="text"
											value={paymentDetails.ibanNumber}
											readonly
											class="input-bordered input flex-1 bg-base-200 font-mono text-sm"
										/>
										<button
											type="button"
											class="btn btn-square"
											onclick={() => copyToClipboard(paymentDetails.ibanNumber, 'iban')}
										>
											{#if copiedField === 'iban'}
												<IconCheck class="size-5 text-success" />
											{:else}
												<IconCopy class="size-5" />
											{/if}
										</button>
									</div>
								</div>

								<!-- Reference -->
								<div class="space-y-2">
									<label class="text-sm text-base-content/60">Payment Reference</label>
									<div class="flex gap-2">
										<input
											type="text"
											value={paymentDetails.reference}
											readonly
											class="input-bordered input flex-1 bg-base-200 font-mono"
										/>
										<button
											type="button"
											class="btn btn-square"
											onclick={() => copyToClipboard(paymentDetails.reference, 'reference')}
										>
											{#if copiedField === 'reference'}
												<IconCheck class="size-5 text-success" />
											{:else}
												<IconCopy class="size-5" />
											{/if}
										</button>
									</div>
								</div>

								<div class="rounded-lg border border-info/30 bg-info/10 p-4">
									<p class="text-sm">
										Please transfer <strong
											>{formatPrice(paymentDetails.amount, paymentDetails.currency)}</strong
										>
										to the card number above and include the reference in your transfer description.
									</p>
								</div>
							</div>
						</div>
					{:else if paymentDetails.paymentMethod === 'tether'}
						<div class="rounded-lg border border-base-300 bg-base-100 p-5">
							<div class="mb-4 flex items-center gap-2">
								<FluentPayment24Regular class="size-5 text-primary" />
								<h4 class="text-lg font-semibold">USDT Transfer Details</h4>
							</div>

							<div class="space-y-4">
								<!-- Wallet Address -->
								<div class="space-y-2">
									<label class="text-sm text-base-content/60">Wallet Address (ERC-20)</label>
									<div class="flex gap-2">
										<input
											type="text"
											value={paymentDetails.tetherAddress}
											readonly
											class="input-bordered input flex-1 bg-base-200 font-mono text-xs"
										/>
										<button
											type="button"
											class="btn btn-square"
											onclick={() => copyToClipboard(paymentDetails.tetherAddress, 'address')}
										>
											{#if copiedField === 'address'}
												<IconCheck class="size-5 text-success" />
											{:else}
												<IconCopy class="size-5" />
											{/if}
										</button>
									</div>
								</div>

								<div class="rounded-lg border border-warning/30 bg-warning/10 p-4">
									<p class="text-sm">
										Send <strong>{paymentDetails.amount} USDT</strong> to the address above on the
										<strong>Ethereum network (ERC-20)</strong>. Double-check the address before
										sending.
									</p>
								</div>
							</div>
						</div>
					{/if}

					<!-- Confirmation Input -->
					<div class="rounded-lg border border-base-300 bg-base-100 p-5">
						<div class="space-y-3">
							<label class="text-base font-semibold">
								{paymentDetails.paymentMethod === 'iban'
									? 'Enter Your Transaction Reference'
									: 'Enter the Transaction Hash (TxHash)'}
							</label>
							<input
								type="text"
								bind:value={transactionReference}
								placeholder={paymentDetails.paymentMethod === 'iban'
									? 'e.g., REF123456789'
									: '0x...'}
								class="input-bordered input w-full bg-base-200 font-mono"
								disabled={processing}
							/>
							<p class="text-sm text-base-content/60">This helps us verify your payment</p>
						</div>
					</div>

					<!-- Actions -->
					<div class="flex gap-3 pt-2">
						<button
							type="button"
							class="btn flex-1 gap-1 btn-primary"
							onclick={handleConfirmPayment}
							disabled={processing || !transactionReference.trim()}
						>
							{#if processing}
								<span class="loading loading-sm loading-spinner"></span>
								Processing...
							{:else}
								<IconCheck class="size-5" />
								Confirm Payment
							{/if}
						</button>
						<button type="button" class="btn" onclick={onClose} disabled={processing}>
							Cancel
						</button>
					</div>
				</div>
			{/if}
		</div>
		<div class="modal-backdrop" onclick={onClose}></div>
	</div>
{/if}
