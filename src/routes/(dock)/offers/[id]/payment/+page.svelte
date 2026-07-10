<!-- src/routes/(dock)/offers/[id]/payment/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconBank from '~icons/fluent/building-bank-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconCheckmarkCircle from '~icons/fluent/checkmark-circle-24-filled';
	import IconShield from '~icons/fluent/shield-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-filled';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import PaymentProgress from './PaymentProgress.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibot } from 'sveltekit-superforms/adapters';
	import { initPaymentSchema } from './schema';
	import { formatPrice, formatDate } from '$lib/util';

	type Method = 'iban' | 'tether';

	let { data } = $props();

	let reviewOpen = $state(false);

	const initPaymentForm = superForm(data.form, {
		validators: valibot(initPaymentSchema),
		resetForm: false,

		onResult: async ({ result }) => {
			if (result.type === 'success') {
				const responseData = (result as any).data;

				if (responseData?.success && responseData?.paymentMethod) {
					if (responseData.paymentMethod === 'iban' && responseData.zarinpalPaymentUrl) {
						await goto(responseData.zarinpalPaymentUrl);
					} else if (responseData.paymentMethod === 'tether' && responseData.paymentId) {
						await goto(`/offers/${data.offer.id}/payment/tether/${responseData.paymentId}`);
					}
				}
			}
		}
	});

	const { form: formData, errors, enhance, delayed } = initPaymentForm;

	const methodMeta: Record<
		Method,
		{
			label: string;
			description: string;
			icon: typeof IconBank;
			selectedCard: string;
			iconWrap: string;
			iconColor: string;
		}
	> = {
		iban: {
			label: 'Bank Transfer',
			description: 'Secure card payment via Zarinpal',
			icon: IconBank,
			selectedCard: 'border-primary bg-primary/5 shadow-sm',
			iconWrap: 'bg-primary/15',
			iconColor: 'text-primary'
		},
		tether: {
			label: 'Tether (USDT)',
			description: 'Pay with cryptocurrency',
			icon: IconWallet,
			selectedCard: 'border-secondary bg-secondary/5 shadow-sm',
			iconWrap: 'bg-secondary/15',
			iconColor: 'text-secondary'
		}
	};

	const availableMethods = $derived(
		[
			data.businessPaymentMethods.ibanEnabled ? ('iban' as const) : null,
			data.businessPaymentMethods.tetherEnabled ? ('tether' as const) : null
		].filter((m): m is Method => m !== null)
	);

	// Make sure a valid, available method is always selected.
	$effect(() => {
		if (availableMethods.length && !availableMethods.includes($formData.paymentMethod as Method)) {
			$formData.paymentMethod = availableMethods[0];
		}
	});

	const selectMethod = (method: Method) => {
		$formData.paymentMethod = method;
	};

	const formErrors = $derived($errors._errors ?? []);
</script>

<BaseLayout title="Checkout" description={data.offer.name} icon={IconWallet}>
	<div class="space-y-6">
		<PaymentProgress current={1} />

		{#if formErrors.length}
			<Alert type="error">
				<p class="font-medium">We couldn't start your payment</p>
				<p class="mt-1 text-sm opacity-80">{formErrors.join(' ')}</p>
			</Alert>
		{/if}

		<!-- Order Summary -->
		<div
			class="overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/15 via-primary/5 to-base-100 p-6"
		>
			<div class="text-xs font-bold tracking-wider text-primary/70 uppercase">Your order</div>
			<div class="mt-1 text-lg font-bold text-base-content">{data.offer.name}</div>

			<div class="my-4 border-t border-dashed border-primary/20"></div>

			<div class="flex items-end justify-between">
				<span class="text-sm font-medium text-base-content/60">Total to pay</span>
				<span class="text-3xl font-extrabold text-primary">
					{formatPrice(data.offer.price, data.offer.currency)}
				</span>
			</div>

			{#if data.offer.isRecurring}
				<div class="mt-4 flex items-center gap-3 rounded-2xl bg-base-100/70 p-3">
					<div class="rounded-xl bg-secondary/20 p-2">
						<IconCalendar class="size-5 text-secondary" />
					</div>
					<div>
						<div class="text-xs font-medium tracking-wide text-base-content/50 uppercase">
							Pickup date
						</div>
						<div class="font-semibold text-base-content">{formatDate(data.pickupDate)}</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Payment Method Selection -->
		<div class="space-y-3">
			<h2 class="text-lg font-semibold">How would you like to pay?</h2>

			{#each availableMethods as method (method)}
				{@const meta = methodMeta[method]}
				{@const selected = $formData.paymentMethod === method}
				<button
					type="button"
					onclick={() => selectMethod(method)}
					aria-pressed={selected}
					class="flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all
					{selected ? meta.selectedCard : 'border-base-300 bg-base-100 hover:border-base-content/20'}"
				>
					<div class="rounded-xl p-3 {meta.iconWrap}">
						<meta.icon class="size-6 {meta.iconColor}" />
					</div>
					<div class="flex-1">
						<div class="font-semibold">{meta.label}</div>
						<div class="text-sm text-base-content/60">{meta.description}</div>
					</div>

					{#if selected}
						<IconCheckmarkCircle class="size-6 {meta.iconColor}" />
					{:else}
						<div class="size-6 rounded-full border-2 border-base-300"></div>
					{/if}
				</button>
			{/each}
		</div>

		<div class="flex items-center justify-center gap-2 text-xs text-base-content/50">
			<IconShield class="size-4" />
			<span>Payments are encrypted and processed securely</span>
		</div>

		<!-- Continue -->
		<button
			type="button"
			onclick={() => (reviewOpen = true)}
			disabled={!$formData.paymentMethod || $delayed}
			class="btn w-full btn-lg btn-primary"
		>
			Review &amp; pay
			<IconArrowRight class="size-5" />
		</button>
	</div>
</BaseLayout>

<!-- Review bottom sheet -->
<Modal bind:open={reviewOpen} title="Review your order" position="bottom">
	{#if $formData.paymentMethod}
		{@const meta = methodMeta[$formData.paymentMethod as Method]}
		<div class="space-y-4">
			<div class="rounded-2xl bg-base-200 p-4">
				<div class="flex items-center justify-between py-1">
					<span class="text-sm text-base-content/60">Item</span>
					<span class="max-w-[60%] truncate text-right font-medium">{data.offer.name}</span>
				</div>
				{#if data.offer.isRecurring}
					<div class="flex items-center justify-between py-1">
						<span class="text-sm text-base-content/60">Pickup date</span>
						<span class="font-medium">{formatDate(data.pickupDate)}</span>
					</div>
				{/if}
				<div class="flex items-center justify-between py-1">
					<span class="text-sm text-base-content/60">Payment method</span>
					<span class="flex items-center gap-2 font-medium">
						<meta.icon class="size-4 {meta.iconColor}" />
						{meta.label}
					</span>
				</div>
				<div class="my-2 border-t border-base-300"></div>
				<div class="flex items-center justify-between py-1">
					<span class="font-semibold">Total</span>
					<span class="text-xl font-extrabold text-primary">
						{formatPrice(data.offer.price, data.offer.currency)}
					</span>
				</div>
			</div>

			<form method="POST" action="?/initPayment" use:enhance>
				<input type="hidden" name="pickupDate" value={$formData.pickupDate} />
				<input type="hidden" name="paymentMethod" value={$formData.paymentMethod} />

				<button type="submit" disabled={$delayed} class="btn w-full btn-lg btn-primary">
					{#if $delayed}
						<span class="loading loading-spinner"></span>
						Processing…
					{:else}
						Pay {formatPrice(data.offer.price, data.offer.currency)}
					{/if}
				</button>
			</form>

			<p class="text-center text-xs text-base-content/50">
				You'll {$formData.paymentMethod === 'iban'
					? 'be redirected to a secure payment gateway'
					: 'complete the transfer on the next screen'}.
			</p>
		</div>
	{/if}
</Modal>
