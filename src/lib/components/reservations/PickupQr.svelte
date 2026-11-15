<!-- Live pickup code: a signed QR code that changes every few seconds, plus 6 digits for typing. -->
<script lang="ts">
	import { renderSVG } from 'uqr';
	import { createPickupCode, pickupDigits, REFRESH_S } from '#lib/pickupCode.js';

	interface Props {
		reservationId: string;
		claimToken: string;
		/** Server time at page load; corrects a phone clock that is off. */
		serverNow: number;
	}

	let { reservationId, claimToken, serverNow }: Props = $props();

	// svelte-ignore state_referenced_locally
	const skew = serverNow - Date.now();
	let svg = $state('');
	let digits = $state('');
	let left = $state(REFRESH_S);
	let failed = $state(false);

	async function refresh() {
		const now = Date.now() + skew;
		try {
			const [code, pin] = await Promise.all([
				createPickupCode(claimToken, reservationId, now),
				pickupDigits(claimToken, reservationId, now)
			]);
			svg = renderSVG(code, { border: 1, ecc: 'M', whiteColor: '#fff', blackColor: '#1c1530' });
			digits = pin;
			failed = false;
		} catch {
			// WebCrypto needs a secure context (https).
			failed = true;
		}
		left = REFRESH_S;
	}

	$effect(() => {
		refresh();
		const timer = setInterval(() => {
			left -= 1;
			if (left <= 0) refresh();
		}, 1000);
		return () => clearInterval(timer);
	});
</script>

<div class="flex flex-col items-center gap-2">
	{#if failed}
		<p class="text-sm text-error">Couldn't create a pickup code on this device.</p>
	{:else}
		<div class="pickup-qr w-52 overflow-hidden rounded-2xl bg-white p-2 shadow-sm" aria-label="Pickup QR code">
			{@html svg}
		</div>
		<p class="font-mono text-2xl font-bold tracking-[0.3em] tabular-nums" dir="ltr">
			{digits.slice(0, 3)}&nbsp;{digits.slice(3)}
		</p>
		<div class="h-1 w-40 overflow-hidden rounded-full bg-base-300" aria-hidden="true">
			<div class="h-full bg-primary transition-all duration-1000 ease-linear" style="width: {(left / REFRESH_S) * 100}%"></div>
		</div>
		<p class="text-xs text-base-content/60">Live code — screenshots stop working after a minute.</p>
	{/if}
</div>

<style>
	.pickup-qr :global(svg) {
		width: 100%;
		height: auto;
		display: block;
	}
</style>
