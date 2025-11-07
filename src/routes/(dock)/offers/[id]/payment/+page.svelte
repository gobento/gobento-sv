<!-- src/routes/(dock)/offers/[id]/payment/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconBank from '~icons/fluent/building-bank-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconError from '~icons/fluent/error-circle-24-regular';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibot } from 'sveltekit-superforms/adapters';
	import { initPaymentSchema } from './schema';
	import { formatPrice } from '$lib/util';

	let { data, form } = $props();

	const initPaymentForm = superForm(data.form, {
		validators: valibot(initPaymentSchema),
		resetForm: false,
		onResult: async ({ result }) => {
			console.log('Payment init result:', result);

			if (result.type === 'success' && result.data) {
				const responseData = result.data as any;

				if (responseData?.success && responseData?.paymentMethod) {
					if (responseData.paymentMethod === 'iban' && responseData.zarinpalPaymentUrl) {
						// Redirect to Zarinpal
						window.location.href = responseData.zarinpalPaymentUrl;
					} else if (responseData.paymentMethod === 'tether' && responseData.paymentId) {
						// Navigate to tether payment page
						goto(`/offers/${data.offer.id}/payment/tether/${responseData.paymentId}`);
					}
				}
			}
		}
	});

	const { form: formData, errors, enhance, delayed, submit } = initPaymentForm;

	const handleMethodSelect = async (method: 'iban' | 'tether') => {
		$formData.paymentMethod = method;
		// Don't manually submit - let the form submit naturally
	};
</script>

<BaseLayout title="Complete Payment" description={data.offer.name} icon={IconWallet}>
	<!-- Error Message -->
	{#if form?.error}
		<div class="rounded-2xl bg-error/10 p-5">
			<div class="flex gap-3">
				<IconError class="mt-0.5 size-6 text-error" />
				<div class="flex-1">
					<p class="font-medium text-error">Error</p>
					<p class="mt-1 text-sm text-error/80">{form.error}</p>
				</div>
			</div>
		</div>
	{:else if $errors['']}
		<div class="rounded-2xl bg-error/10 p-5">
			<div class="flex gap-3">
				<IconError class="mt-0.5 size-6 text-error" />
				<div class="flex-1">
					<p class="font-medium text-error">Error</p>
					<p class="mt-1 text-sm text-error/80">
						{Array.isArray($errors['']) ? $errors[''][0] : $errors['']}
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Order Summary -->
	<div class="space-y-4">
		<div class="rounded-2xl bg-base-200 p-6">
			<div class="flex items-baseline justify-between">
				<span class="text-sm font-medium text-primary">Total Amount</span>
				<span class="text-2xl font-bold text-primary">
					{formatPrice(data.offer.price, data.offer.currency)}
				</span>
			</div>
		</div>

		{#if data.offer.isRecurring}
			<div class="rounded-2xl bg-base-200 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-secondary/20 p-2">
							<IconCalendar class="size-5 text-secondary" />
						</div>
						<div>
							<div class="text-xs font-medium tracking-wide text-secondary/70 uppercase">
								Pickup Date
							</div>
							<div class="mt-0.5 font-semibold text-secondary">
								{data.pickupDate}
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Payment Method Selection -->
	<div class="space-y-4">
		<h2 class="text-lg font-semibold">Select Payment Method</h2>

		<div class="space-y-3">
			{#if data.businessPaymentMethods.ibanEnabled}
				<form method="POST" action="?/initPayment" use:enhance>
					<input type="hidden" name="pickupDate" bind:value={$formData.pickupDate} />
					<input type="hidden" name="paymentMethod" value="iban" />

					<button
						type="submit"
						onclick={() => handleMethodSelect('iban')}
						disabled={$delayed}
						class="flex w-full items-center gap-4 rounded-2xl border-2 border-base-300 bg-base-100 p-5 text-left transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50"
					>
						<div class="rounded-xl bg-primary/20 p-3">
							<IconBank class="size-6 text-primary" />
						</div>
						<div class="flex-1">
							<div class="font-semibold">Bank Transfer (Zarinpal)</div>
							<div class="text-sm opacity-60">Secure payment gateway</div>
						</div>
						{#if $delayed && $formData.paymentMethod === 'iban'}
							<span class="loading loading-sm loading-spinner text-primary"></span>
						{:else}
							<span class="text-2xl text-primary">→</span>
						{/if}
					</button>
				</form>
			{/if}

			{#if data.businessPaymentMethods.tetherEnabled}
				<form method="POST" action="?/initPayment" use:enhance>
					<input type="hidden" name="pickupDate" bind:value={$formData.pickupDate} />
					<input type="hidden" name="paymentMethod" value="tether" />

					<button
						type="submit"
						onclick={() => handleMethodSelect('tether')}
						disabled={$delayed}
						class="flex w-full items-center gap-4 rounded-2xl border-2 border-base-300 bg-base-100 p-5 text-left transition-all hover:border-secondary hover:bg-secondary/5 disabled:opacity-50"
					>
						<div class="rounded-xl bg-secondary/20 p-3">
							<IconWallet class="size-6 text-secondary" />
						</div>
						<div class="flex-1">
							<div class="font-semibold">Tether (USDT)</div>
							<div class="text-sm opacity-60">Cryptocurrency payment</div>
						</div>
						{#if $delayed && $formData.paymentMethod === 'tether'}
							<span class="loading loading-sm loading-spinner text-secondary"></span>
						{:else}
							<span class="text-2xl text-secondary">→</span>
						{/if}
					</button>
				</form>
			{/if}
		</div>
	</div>
</BaseLayout>
