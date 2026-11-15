<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';
	import { superForm } from 'sveltekit-superforms';
	import { valibot } from 'sveltekit-superforms/adapters';
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconBank from '~icons/fluent/building-bank-24-regular';
	import IconCalendar from '~icons/fluent/calendar-clock-24-regular';
	import IconStore from '~icons/fluent/building-shop-24-regular';
	import IconCheckmarkCircle from '~icons/fluent/checkmark-circle-24-filled';
	import IconShield from '~icons/fluent/shield-checkmark-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-filled';
	import IconLock from '~icons/fluent/lock-closed-24-filled';
	import BaseLayout from '#lib/components/BaseLayout.svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatPickupWindow } from '#lib/components/reservations/pickup.js';
	import { formatPrice } from '#lib/util.js';
	import PaymentProgress from './PaymentProgress.svelte';
	import { initPaymentSchema } from './schema';

	type Method = 'iban' | 'tether';

	let { data } = $props();

	let step = $state<1 | 2>(1);
	// Stays true after a successful submit so the button cannot be pressed again
	// while the browser is on its way to the payment provider.
	let leaving = $state(false);

	// svelte-ignore state_referenced_locally
	const { form: formData, errors, enhance, submitting } = superForm(data.form, {
		validators: valibot(initPaymentSchema),
		resetForm: false,
		onResult: async ({ result }) => {
			if (result.type !== 'success') {
				if (result.type === 'failure') step = 1;
				return;
			}
			const payload = result.data;
			if (!payload?.success) return;

			if (payload.paymentMethod === 'iban' && typeof payload.zarinpalPaymentUrl === 'string') {
				leaving = true;
				// The gateway lives on another origin, which `goto` refuses to load.
				window.location.assign(payload.zarinpalPaymentUrl);
			} else if (payload.paymentMethod === 'tether' && payload.paymentId) {
				leaving = true;
				await goto(`/offers/${data.offer.id}/payment/tether/${payload.paymentId}`);
			}
		},
		onError: () => {
			step = 1;
		}
	});

	const METHODS: Record<Method, { label: string; description: string; icon: typeof IconBank }> = {
		iban: {
			label: 'Card or bank payment',
			description: 'Pay through our secure payment gateway',
			icon: IconBank
		},
		tether: {
			label: 'Tether (USDT)',
			description: 'Transfer from your crypto wallet',
			icon: IconWallet
		}
	};

	const CALLBACK_ERRORS: Record<string, { title: string; text: string }> = {
		payment_cancelled: {
			title: 'Payment cancelled',
			text: 'You have not been charged. You can try again whenever you are ready.'
		},
		already_processed: {
			title: 'This payment was already processed',
			text: 'Check your orders before paying again.'
		}
	};

	const availableMethods = $derived(
		(['iban', 'tether'] as const).filter((method) =>
			method === 'iban'
				? data.businessPaymentMethods.ibanEnabled
				: data.businessPaymentMethods.tetherEnabled
		)
	);

	// The business' preferred method may be one it has since switched off.
	$effect(() => {
		if (availableMethods.length && !availableMethods.includes($formData.paymentMethod)) {
			$formData.paymentMethod = availableMethods[0];
		}
	});

	const selected = $derived(METHODS[$formData.paymentMethod]);
	const SelectedIcon = $derived(selected.icon);
	const total = $derived(formatPrice(data.offer.price, data.offer.currency));
	const savings = $derived(data.offer.originalValue - data.offer.price);
	const formErrors = $derived([
		...($errors._errors ?? []),
		...($errors.pickupDate ?? []),
		...($errors.paymentMethod ?? [])
	]);
	const callbackError = $derived.by(() => {
		const code = page.url.searchParams.get('error');
		if (!code) return null;
		return (
			CALLBACK_ERRORS[code] ?? {
				title: 'The payment did not go through',
				text: 'Nothing was charged. Please try again or choose another payment method.'
			}
		);
	});
	const busy = $derived($submitting || leaving);
	const offerHref = $derived(`/offers/${data.offer.id}`);
</script>

<svelte:head>
	<title>Checkout · {data.offer.name}</title>
</svelte:head>

<BaseLayout
	title="Checkout"
	description="Reserve your bag in three quick steps"
	width="narrow"
	backHref={offerHref}
	backLabel="Back to offer"
>
	<div class="space-y-5 pb-24 md:pb-0">
		<PaymentProgress current={step} />

		{#if formErrors.length}
			<Alert type="error">
				<p class="font-bold">We could not start your payment</p>
				<p class="mt-0.5">{formErrors.join(' ')}</p>
			</Alert>
		{:else if callbackError}
			<Alert type="warn">
				<p class="font-bold">{callbackError.title}</p>
				<p class="mt-0.5">{callbackError.text}</p>
			</Alert>
		{/if}

		<!-- Order summary -->
		<section class="surface animate-rise-in overflow-hidden" aria-labelledby="order-heading">
			<div class="p-5">
				<p class="eyebrow" id="order-heading">Your order</p>
				<h2 class="mt-1 text-xl leading-tight font-extrabold tracking-tight">{data.offer.name}</h2>

				<ul class="mt-4 space-y-3 text-sm">
					<li class="flex items-center gap-3">
						<IconStore class="size-5 shrink-0 text-base-content/45" />
						<span class="min-w-0 truncate font-semibold">
							{data.offer.businessName}{#if data.offer.locationName && data.offer.locationName !== data.offer.businessName}
								<span class="font-normal text-base-content/60"> · {data.offer.locationName}</span>
							{/if}
						</span>
					</li>
					<li class="flex items-center gap-3">
						<IconCalendar class="size-5 shrink-0 text-base-content/45" />
						<span class="tabular font-semibold">
							Pickup {formatPickupWindow(data.pickup.from, data.pickup.until)}
						</span>
					</li>
					{#if step === 2}
						<li class="flex items-center gap-3" in:fly={{ y: 8, duration: 250 }}>
							<SelectedIcon class="size-5 shrink-0 text-base-content/45" />
							<span class="min-w-0 flex-1 truncate font-semibold">{selected.label}</span>
							<button
								type="button"
								class="btn -my-2 btn-ghost btn-sm text-primary"
								onclick={() => (step = 1)}
								disabled={busy}
							>
								Change
							</button>
						</li>
					{/if}
				</ul>
			</div>

			<div
				class="flex items-end justify-between gap-4 border-t border-dashed border-base-300 bg-base-200/60 px-5 py-4"
			>
				<div>
					<p class="text-sm font-semibold text-base-content/60">Total</p>
					{#if savings > 0}
						<p class="mt-0.5 text-xs font-bold text-secondary">
							You save {formatPrice(savings, data.offer.currency)}
						</p>
					{/if}
				</div>
				<p class="tabular text-3xl leading-none font-extrabold tracking-tight">{total}</p>
			</div>
		</section>

		{#if data.soldOut}
			<Alert type="warn">
				<p class="font-bold">This offer has just sold out</p>
				<p class="mt-0.5">Someone else was a little faster. There is plenty more to rescue.</p>
			</Alert>
			<Button href="/discover" block size="lg">Browse other offers</Button>
		{:else if step === 1}
			<section class="space-y-3" aria-labelledby="method-heading">
				<h2 id="method-heading" class="text-lg font-extrabold tracking-tight">
					How would you like to pay?
				</h2>

				<div role="radiogroup" aria-labelledby="method-heading" class="space-y-3">
					{#each availableMethods as method, i (method)}
						{@const meta = METHODS[method]}
						{@const active = $formData.paymentMethod === method}
						<button
							type="button"
							role="radio"
							aria-checked={active}
							onclick={() => ($formData.paymentMethod = method)}
							style:--i={i}
							class="surface pressable stagger flex min-h-[4.5rem] w-full animate-rise-in items-center gap-4 p-4 text-start
							{active ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}"
						>
							<div
								class="flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors {active
									? 'bg-primary text-primary-content'
									: 'bg-base-200 text-base-content/60'}"
							>
								<meta.icon class="size-6" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="font-bold">{meta.label}</p>
								<p class="text-sm text-base-content/60">{meta.description}</p>
							</div>
							{#if active}
								<IconCheckmarkCircle class="size-6 shrink-0 animate-pop-in text-primary" />
							{:else}
								<span class="size-6 shrink-0 rounded-full border-2 border-base-300"></span>
							{/if}
						</button>
					{/each}
				</div>
			</section>
		{:else}
			<section class="surface p-5 text-sm" in:fly={{ y: 12, duration: 280 }}>
				<h2 class="text-lg font-extrabold tracking-tight">Almost there</h2>
				<p class="mt-1 text-base-content/70">
					{#if $formData.paymentMethod === 'iban'}
						You will be taken to the payment gateway to complete your purchase, then straight back
						to your pickup ticket.
					{:else}
						On the next screen you will get the wallet address and the exact USDT amount to send.
					{/if}
				</p>
				<p class="mt-3 text-base-content/70">
					Collect your bag during the pickup window. Bags that are not collected in time cannot be
					handed out later.
				</p>
			</section>
		{/if}

		<p class="flex items-center justify-center gap-2 text-xs text-base-content/55">
			<IconShield class="size-4 shrink-0" />
			Payments are encrypted and processed securely
		</p>

		{#if !data.soldOut}
			<div
				class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[1000] border-t border-base-300/70 bg-base-100/90 px-4 py-3 backdrop-blur-xl md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
			>
				{#if step === 1}
					<Button
						block
						size="lg"
						iconRight={IconArrowRight}
						disabled={availableMethods.length === 0}
						onclick={() => (step = 2)}
					>
						Continue to review
					</Button>
				{:else}
					<form method="POST" action="?/initPayment" use:enhance>
						<input type="hidden" name="pickupDate" value={$formData.pickupDate} />
						<input type="hidden" name="paymentMethod" value={$formData.paymentMethod} />
						<Button
							type="submit"
							block
							size="lg"
							icon={IconLock}
							loading={busy}
							loadingLabel={leaving ? 'Opening payment…' : 'Starting payment…'}
						>
							Pay {total}
						</Button>
					</form>
				{/if}
			</div>
		{/if}
	</div>
</BaseLayout>
