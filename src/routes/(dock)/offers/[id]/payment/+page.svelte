<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { fly, slide } from 'svelte/transition';
	import { superForm } from 'sveltekit-superforms';
	import { valibot } from 'sveltekit-superforms/adapters';
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconBank from '~icons/fluent/building-bank-24-regular';
	import IconCalendar from '~icons/fluent/calendar-clock-24-regular';
	import IconStore from '~icons/fluent/building-shop-24-regular';
	import IconCheckmarkCircle from '~icons/fluent/checkmark-circle-24-filled';
	import IconLock from '~icons/fluent/lock-closed-24-filled';
	import BaseLayout from '#lib/components/layout/BaseLayout.svelte';
	import Alert from '#lib/components/ui/Alert.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatPickupWindow } from '#lib/components/reservations/pickup.js';
	import { formatPrice } from '#lib/util.js';
	import PaymentProgress from './PaymentProgress.svelte';
	import { initPaymentSchema } from './schema';

	type Method = 'iban' | 'tether';

	let { data } = $props();

	// Stays true after a successful submit so the button cannot be pressed again
	// while the browser is on its way to the payment provider.
	let leaving = $state(false);
	// The method picker stays folded away: most people pay with their standard method.
	let choosing = $state(false);

	// svelte-ignore state_referenced_locally
	const {
		form: formData,
		errors,
		enhance,
		submitting
	} = superForm(data.form, {
		validators: valibot(initPaymentSchema),
		resetForm: false,
		onResult: async ({ result }) => {
			if (result.type !== 'success') return;
			const payload = result.data;
			if (!payload?.success) return;

			if (payload.paymentMethod === 'iban' && typeof payload.zarinpalPaymentUrl === 'string') {
				leaving = true;
				// The gateway lives on another origin, which `goto` refuses to load.
				window.location.assign(payload.zarinpalPaymentUrl);
			} else if (payload.paymentMethod === 'tether' && payload.paymentId) {
				leaving = true;
				await goto(
					resolve('/(dock)/offers/[id]/payment/tether/[paymentId]', {
						id: data.offer.id,
						paymentId: payload.paymentId
					})
				);
			}
		}
	});

	const METHODS: Record<Method, { label: string; icon: typeof IconBank }> = {
		iban: {
			label: 'Card or bank payment',
			icon: IconBank
		},
		tether: {
			label: 'Tether (USDT)',
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
	const offerHref = $derived(resolve('/(dock)/offers/[id]', { id: data.offer.id }));
</script>

<svelte:head>
	<title>Checkout · {data.offer.name}</title>
</svelte:head>

<BaseLayout title="Checkout" width="narrow" backHref={offerHref} backLabel="Back to offer">
	<div class="space-y-5 pb-24 md:pb-0">
		<PaymentProgress current={1} />

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
							{data.offer
								.businessName}{#if data.offer.locationName && data.offer.locationName !== data.offer.businessName}
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
			<Button href={resolve('/(dock)/discover')} block size="lg">Browse other offers</Button>
		{:else}
			<section class="space-y-3" aria-labelledby="method-heading">
				<!-- The standard method from the settings, ready to go. -->
				<div class="surface flex items-center gap-4 p-4">
					{#key $formData.paymentMethod}
						<div
							class="flex size-12 shrink-0 animate-pop-in items-center justify-center rounded-2xl bg-primary text-primary-content"
						>
							<selected.icon class="size-6" />
						</div>
						<div class="min-w-0 flex-1" in:fly={{ x: 12, duration: 250 }}>
							<p id="method-heading" class="text-xs font-bold text-base-content/55">Paying with</p>
							<p class="font-bold">{selected.label}</p>
						</div>
					{/key}
					{#if availableMethods.length > 1}
						<button
							type="button"
							class="btn shrink-0 btn-ghost text-primary btn-sm"
							aria-expanded={choosing}
							aria-controls="method-options"
							onclick={() => (choosing = !choosing)}
							disabled={busy}
						>
							{choosing ? 'Done' : 'Change'}
						</button>
					{/if}
				</div>

				{#if choosing}
					<div
						id="method-options"
						role="radiogroup"
						aria-labelledby="method-heading"
						class="space-y-2"
						transition:slide={{ duration: 220 }}
					>
						{#each availableMethods as method (method)}
							{@const meta = METHODS[method]}
							{@const active = $formData.paymentMethod === method}
							<button
								type="button"
								role="radio"
								aria-checked={active}
								onclick={() => {
									$formData.paymentMethod = method;
									choosing = false;
								}}
								class="surface pressable flex w-full items-center gap-3 px-4 py-3 text-start
								{active ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}"
							>
								<meta.icon
									class="size-5 shrink-0 {active ? 'text-primary' : 'text-base-content/55'}"
								/>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-bold">{meta.label}</p>
								</div>
								{#if active}
									<IconCheckmarkCircle class="size-5 shrink-0 animate-pop-in text-primary" />
								{/if}
							</button>
						{/each}
						<a
							href={resolve('/(dock)/profile/edit')}
							class="block px-1 pt-1 text-xs font-semibold text-primary"
						>
							Set your standard method
						</a>
					</div>
				{/if}
			</section>
		{/if}

		{#if !data.soldOut}
			<div
				class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[1000] border-t border-base-300/70 bg-base-100/90 px-4 py-3 backdrop-blur-xl md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
			>
				<form method="POST" action="?/initPayment" use:enhance>
					<input type="hidden" name="pickupDate" value={$formData.pickupDate} />
					<input type="hidden" name="paymentMethod" value={$formData.paymentMethod} />
					<Button
						type="submit"
						block
						size="lg"
						icon={IconLock}
						disabled={availableMethods.length === 0}
						loading={busy}
						loadingLabel={leaving ? 'Opening payment…' : 'Starting payment…'}
					>
						{#key $formData.paymentMethod}
							<span in:fly={{ y: 8, duration: 220 }}
								>Pay {total}{$formData.paymentMethod === 'tether' ? ' with USDT' : ''}</span
							>
						{/key}
					</Button>
				</form>
			</div>
		{/if}
	</div>
</BaseLayout>
