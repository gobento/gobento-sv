<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount, tick } from 'svelte';
	import { fly, slide } from 'svelte/transition';
	import { superForm } from 'sveltekit-superforms';
	import { valibot } from 'sveltekit-superforms/adapters';
	import { renderSVG } from 'uqr';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconCheck from '~icons/fluent/checkmark-24-filled';
	import IconPaste from '~icons/fluent/clipboard-paste-24-regular';
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconWarning from '~icons/fluent/warning-24-regular';
	import BaseLayout from '#lib/components/BaseLayout.svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { toast } from '#lib/components/ui/toast.svelte.js';
	import PaymentProgress from '../../PaymentProgress.svelte';
	import { txHashSchema } from './schema';

	let { data } = $props();

	const HASH = /^0x[a-fA-F0-9]{64}$/;
	const POLL_MS = 5000;

	type Phase = 'idle' | 'confirming';

	let phase = $state<Phase>('idle');
	let confirmations = $state(0);
	let shake = $state(0);
	let pasteError = $state<string | null>(null);
	let copied = $state<'address' | 'amount' | null>(null);
	let gotAddress = $state(false);
	let touch = $state(false);
	let canPaste = $state(false);
	let now = $state(Date.now());
	let pollTimer: ReturnType<typeof setTimeout> | undefined;
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	let hashInput = $state<HTMLInputElement | null>(null);

	// svelte-ignore state_referenced_locally
	const {
		form: formData,
		errors,
		enhance,
		submitting,
		submit
	} = superForm(data.form, {
		validators: valibot(txHashSchema),
		resetForm: false,
		onResult: async ({ result, cancel }) => {
			clearTimeout(pollTimer);
			// Confirmed: the server sends us to the pickup ticket, which celebrates.
			if (result.type === 'redirect') {
				navigator.vibrate?.([18, 40, 18]);
				return;
			}
			if (result.type !== 'success') {
				phase = 'idle';
				if (result.type === 'failure') shake++;
				return;
			}
			const payload = result.data as { pending?: boolean; confirmations?: number } | undefined;
			if (payload?.pending) {
				cancel(); // nothing on the page changes until the transfer is confirmed
				phase = 'confirming';
				confirmations = payload.confirmations ?? 0;
				pollTimer = setTimeout(() => submit(), POLL_MS);
			}
		},
		onError: () => {
			phase = 'idle';
			shake++;
		}
	});

	const amountLabel = $derived(
		data.payment.amountUsdt.toLocaleString('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 6
		})
	);
	const qrSvg = $derived(
		renderSVG(data.paymentUri, { border: 1, ecc: 'M', whiteColor: '#fff', blackColor: '#1c1530' })
	);
	const address = $derived(data.platformWalletAddress);
	const shortAddress = $derived(`${address.slice(0, 8)}…${address.slice(-6)}`);

	// Hold timer: how long the bag stays reserved for this payment.
	const expiresAt = $derived(new Date(data.payment.expiresAt).getTime());
	const holdTotal = $derived(Math.max(1, expiresAt - new Date(data.payment.createdAt).getTime()));
	const remaining = $derived(Math.max(0, expiresAt - now));
	const holdFraction = $derived(remaining / holdTotal);
	const expired = $derived(remaining === 0);
	const clock = $derived.by(() => {
		const s = Math.ceil(remaining / 1000);
		return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
	});

	const formErrors = $derived($errors._errors ?? []);
	const hashError = $derived(pasteError ?? $errors.txHash?.[0]);
	const checking = $derived($submitting && phase === 'idle');

	onMount(() => {
		touch = matchMedia('(pointer: coarse)').matches;
		canPaste = typeof navigator.clipboard?.readText === 'function';
		const clockTimer = setInterval(() => (now = Date.now()), 1000);
		return () => {
			clearInterval(clockTimer);
			clearTimeout(pollTimer);
			clearTimeout(copyTimer);
		};
	});

	async function copy(text: string, what: 'address' | 'amount') {
		try {
			await navigator.clipboard.writeText(text);
			copied = what;
			if (what === 'address') gotAddress = true;
			navigator.vibrate?.(12);
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = null), 1800);
		} catch {
			toast.error('Could not copy. Select the text and copy it manually.');
		}
	}

	/** Submits as soon as a complete hash is in the field: no extra tap needed. */
	async function maybeSubmit() {
		pasteError = null;
		await tick();
		const value = $formData.txHash.trim();
		if (value !== $formData.txHash) $formData.txHash = value;
		if (HASH.test(value) && phase === 'idle' && !$submitting) submit();
	}

	async function pasteHash() {
		try {
			const text = (await navigator.clipboard.readText()).trim();
			pasteError = null;
			$formData.txHash = text;
			if (!HASH.test(text)) {
				pasteError =
					'That does not look like a transaction hash yet. Copy it from your wallet again.';
				shake++;
				return;
			}
			maybeSubmit();
		} catch {
			hashInput?.focus();
		}
	}

	function useDifferentHash() {
		clearTimeout(pollTimer);
		phase = 'idle';
		confirmations = 0;
		$formData.txHash = '';
		tick().then(() => hashInput?.focus());
	}
</script>

<svelte:head>
	<title>Send payment · {data.offer.name}</title>
</svelte:head>

<BaseLayout
	title="Send your payment"
	description={data.offer.name}
	width="narrow"
	backHref={resolve('/(dock)/offers/[id]/payment', { id: data.offer.id })}
	backLabel="Back to checkout"
>
	<div class="space-y-5 pb-24 md:pb-0">
		<PaymentProgress current={2} />

		<!-- Step 1: send -->
		<section class="surface animate-rise-in overflow-hidden" aria-labelledby="send-heading">
			<div class="flex items-center gap-3 px-5 pt-5">
				<span class="step-dot" class:step-dot-done={gotAddress}>
					{#if gotAddress}<IconCheck class="size-4 animate-pop-in" />{:else}1{/if}
				</span>
				<h2 id="send-heading" class="flex-1 font-extrabold">Send this payment</h2>

				<div
					class="flex items-center gap-1.5 rounded-full py-1 ps-1 pe-2.5 text-xs font-bold {expired
						? 'bg-warning/15 text-warning-content'
						: holdFraction < 0.2
							? 'bg-warning/15'
							: 'bg-base-200'}"
					title="Your bag is held while you pay"
				>
					<svg viewBox="0 0 20 20" class="size-5 -rotate-90" aria-hidden="true">
						<circle cx="10" cy="10" r="8" fill="none" stroke-width="3" class="stroke-base-300" />
						<circle
							cx="10"
							cy="10"
							r="8"
							fill="none"
							stroke-width="3"
							stroke-linecap="round"
							pathLength="100"
							stroke-dasharray="100"
							stroke-dashoffset={100 - holdFraction * 100}
							class="transition-[stroke-dashoffset] duration-1000 ease-linear {holdFraction < 0.2
								? 'stroke-warning'
								: 'stroke-primary'}"
						/>
					</svg>
					<span class="tabular">{expired ? 'Hold ended' : `${clock} held`}</span>
				</div>
			</div>

			<div class="flex flex-col items-center px-5 pt-5 pb-5">
				<!-- Scanning only works from a second screen, so phones skip the QR code
					     and open the wallet app directly instead. -->
				<div class="mb-4 hidden flex-col items-center md:flex">
					<div
						class="qr animate-pop-in rounded-3xl bg-white p-2 shadow-soft"
						style:animation-delay="120ms"
						role="img"
						aria-label="QR code with the payment details for your wallet"
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- generated locally from our own payment URI -->
						{@html qrSvg}
					</div>
				</div>

				<button
					type="button"
					class="pressable group relative rounded-2xl px-4 py-2"
					onclick={() => copy(String(data.payment.amountUsdt), 'amount')}
					aria-label="Copy amount {amountLabel} USDT"
				>
					<span class="tabular text-4xl font-extrabold tracking-tight">{amountLabel}</span>
					<span class="text-xl font-bold text-base-content/55">USDT</span>
					<span
						class="ms-1 inline-flex size-7 items-center justify-center rounded-full align-middle transition-colors {copied ===
						'amount'
							? 'bg-success text-success-content'
							: 'bg-base-200 text-base-content/60 group-hover:bg-base-300'}"
					>
						{#if copied === 'amount'}
							<IconCheck class="size-4 animate-pop-in" />
						{:else}
							<IconCopy class="size-4" />
						{/if}
					</span>
					{#if copied === 'amount'}
						<span class="copied-bubble">Copied!</span>
					{/if}
				</button>
				<span class="mt-1 badge gap-1 border-0 bg-warning/15 font-bold">
					<IconWarning class="size-3.5 text-warning" /> ERC-20 only
				</span>

				<!-- Prefills token, address and amount in wallets that support payment links. -->
				<Button
					href={data.paymentUri}
					icon={IconWallet}
					size="lg"
					block
					class="mt-5 md:hidden"
					onclick={() => (gotAddress = true)}
				>
					Open wallet app
				</Button>
				{#if touch}
					<Button
						href={data.paymentUri}
						icon={IconWallet}
						outline
						class="mt-4 hidden md:inline-flex"
						onclick={() => (gotAddress = true)}
					>
						Open wallet app
					</Button>
				{/if}
			</div>

			<div class="border-t border-dashed border-base-300 bg-base-200/60 px-5 py-4">
				<p class="text-xs font-bold text-base-content/55">To this address</p>
				<div class="mt-1.5 flex items-center gap-3">
					<p
						class="min-w-0 flex-1 font-mono text-sm break-all select-all"
						dir="ltr"
						title={address}
					>
						<span class="sm:hidden">{shortAddress}</span>
						<span class="hidden sm:inline">{address}</span>
					</p>
					<Button
						size="sm"
						variant={copied === 'address' ? 'success' : 'neutral'}
						outline={copied !== 'address'}
						icon={copied === 'address' ? IconCheck : IconCopy}
						onclick={() => copy(address, 'address')}
						class="shrink-0 {copied === 'address' ? 'animate-heart' : ''}"
					>
						{copied === 'address' ? 'Copied' : 'Copy'}
					</Button>
				</div>
			</div>
		</section>

		{#if expired}
			<div transition:slide>
				<Alert type="warn">
					<p class="font-bold">Hold time over. Already paid? Paste your hash anyway.</p>
				</Alert>
			</div>
		{/if}

		<!-- Step 2: confirm -->
		<section
			class="surface animate-rise-in p-5"
			style:animation-delay="80ms"
			aria-labelledby="confirm-heading"
			aria-live="polite"
		>
			<div class="flex items-center gap-3">
				<span class="step-dot" class:step-dot-done={phase === 'confirming'}>
					{#if phase === 'confirming'}<IconCheck class="size-4 animate-pop-in" />{:else}2{/if}
				</span>
				<h2 id="confirm-heading" class="font-extrabold">
					{phase === 'confirming' ? 'Transfer found' : 'Paste the transaction hash'}
				</h2>
			</div>

			{#if phase === 'confirming'}
				<div class="mt-5 text-center" in:fly={{ y: 10, duration: 300 }}>
					<div class="flex items-center justify-center" aria-hidden="true">
						{#each { length: data.requiredConfirmations } as _, i (i)}
							{#if i > 0}
								<span
									class="h-1 w-6 rounded-full transition-colors duration-500 {i <= confirmations
										? 'bg-success'
										: 'bg-base-300'}"
								></span>
							{/if}
							<span
								class="block-cube {i < confirmations
									? 'block-cube-done'
									: i === confirmations
										? 'block-cube-next'
										: ''}"
							>
								{#if i < confirmations}<IconCheck class="size-5 animate-pop-in" />{/if}
							</span>
						{/each}
					</div>
					<p class="mt-4 font-bold">
						{#if confirmations === 0}
							Waiting for the network to pick it up…
						{:else}
							Confirming · {confirmations} of {data.requiredConfirmations}
						{/if}
					</p>
					<button type="button" class="btn mt-3 btn-ghost btn-sm" onclick={useDifferentHash}>
						Use a different hash
					</button>
				</div>
			{:else}
				{#if formErrors.length}
					<div class="mt-3"><Alert type="error">{formErrors.join(' ')}</Alert></div>
				{/if}
			{/if}

			<!-- Stays mounted while confirming: the automatic re-checks submit it. -->
			<form
				id="tx-form"
				method="POST"
				use:enhance
				class="mt-3"
				class:hidden={phase === 'confirming'}
			>
				{#key shake}
					<div class="flex gap-2" class:shake={shake > 0}>
						<label for="txHash" class="sr-only">Transaction hash</label>
						<input
							bind:this={hashInput}
							id="txHash"
							name="txHash"
							type="text"
							dir="ltr"
							placeholder="0x…"
							autocomplete="off"
							autocapitalize="off"
							spellcheck="false"
							bind:value={$formData.txHash}
							oninput={maybeSubmit}
							readonly={$submitting}
							aria-invalid={hashError ? 'true' : undefined}
							aria-describedby={hashError ? 'txHash-error' : undefined}
							class="input min-w-0 flex-1 font-mono text-sm {hashError ? 'input-error' : ''}"
							required
						/>
						{#if canPaste}
							<Button
								variant="neutral"
								outline
								icon={IconPaste}
								onclick={pasteHash}
								disabled={$submitting}
								class="shrink-0"
							>
								Paste
							</Button>
						{/if}
					</div>
				{/key}
				{#if hashError}
					<p id="txHash-error" class="mt-2 text-sm font-semibold text-error" in:fly={{ y: -4 }}>
						{hashError}
					</p>
				{/if}
			</form>
		</section>

		{#if phase === 'idle'}
			<div
				class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[1000] border-t border-base-300/70 bg-base-100/90 px-4 py-3 backdrop-blur-xl md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
				out:fly={{ y: 20, duration: 200 }}
			>
				<Button
					type="submit"
					form="tx-form"
					block
					size="lg"
					icon={IconCheck}
					loading={checking}
					loadingLabel="Looking for your transfer…"
				>
					I have sent it
				</Button>
			</div>
		{/if}
	</div>
</BaseLayout>

<style>
	.qr :global(svg) {
		display: block;
		width: 11rem;
		height: 11rem;
	}

	.step-dot {
		display: flex;
		width: 1.75rem;
		height: 1.75rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		font-size: 0.8rem;
		font-weight: 800;
		background: color-mix(in oklab, var(--color-primary) 12%, transparent);
		color: var(--color-primary);
		transition:
			background-color 0.3s,
			color 0.3s;
	}

	.step-dot-done {
		background: var(--color-success);
		color: var(--color-success-content);
	}

	.copied-bubble {
		position: absolute;
		inset-inline-start: 50%;
		top: -0.5rem;
		translate: -50% 0;
		border-radius: 9999px;
		background: var(--color-success);
		color: var(--color-success-content);
		padding: 0.15rem 0.6rem;
		font-size: 0.75rem;
		font-weight: 800;
		pointer-events: none;
		animation: bubble-up 1.6s var(--ease-out-quint) both;
	}

	.block-cube {
		display: flex;
		width: 2.5rem;
		height: 2.5rem;
		align-items: center;
		justify-content: center;
		border-radius: 0.75rem;
		background: var(--color-base-200);
		border: 2px solid var(--color-base-300);
		transition:
			background-color 0.4s,
			border-color 0.4s,
			color 0.4s;
	}

	.block-cube-done {
		background: var(--color-success);
		border-color: var(--color-success);
		color: var(--color-success-content);
		animation: cube-land 0.5s var(--ease-spring) both;
	}

	.block-cube-next {
		border-style: dashed;
		border-color: var(--color-primary);
		animation: cube-wait 1.4s ease-in-out infinite;
	}

	.shake {
		animation: shake 0.42s var(--ease-out-quint);
	}

	@keyframes bubble-up {
		0% {
			opacity: 0;
			transform: translateY(6px) scale(0.8);
		}
		20% {
			opacity: 1;
			transform: translateY(-8px) scale(1);
		}
		75% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateY(-18px);
		}
	}

	@keyframes cube-land {
		0% {
			transform: translateY(-10px) scale(0.7);
		}
		100% {
			transform: none;
		}
	}

	@keyframes cube-wait {
		0%,
		100% {
			transform: translateY(0);
			opacity: 0.6;
		}
		50% {
			transform: translateY(-4px);
			opacity: 1;
		}
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-7px);
		}
		45% {
			transform: translateX(6px);
		}
		70% {
			transform: translateX(-3px);
		}
	}
</style>
