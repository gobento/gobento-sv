<!-- src/routes/(dock)/shift/+page.svelte -->
<script lang="ts">
	import { withSearch } from '#lib/paths.js';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import BaseLayout from '#lib/components/layout/BaseLayout.svelte';
	import Modal from '#lib/components/ui/Modal.svelte';
	import QrScanner from '#lib/components/staff/QrScanner.svelte';
	import PickupQr from '#lib/components/reservations/PickupQr.svelte';
	import StatusBadge from '#lib/components/ui/StatusBadge.svelte';
	import { RESERVATION_STATUS, PICKUP_STATUS } from '#lib/statuses.js';
	import { formatClock, formatPickupWindow } from '#lib/components/reservations/pickup.js';
	import { FOOD_TYPE_LABELS, isFoodType } from '#lib/foodTypes.js';
	import IconBag from '~icons/fluent/shopping-bag-24-regular';
	import IconScan from '~icons/fluent/qr-code-24-regular';
	import IconBox from '~icons/fluent/box-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconCheck from '~icons/fluent/checkmark-circle-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-circle-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconKeyboard from '~icons/fluent/keyboard-24-regular';

	let { data }: { data: PageData } = $props();

	// Keep the lists fresh while the page stays open at the counter.
	$effect(() => {
		const timer = setInterval(() => invalidateAll(), 60_000);
		return () => clearInterval(timer);
	});

	// --- Days (grouped by the device's local calendar day) ------------------
	const startOfDay = (offset: number) => {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset).getTime();
	};
	let day = $state<0 | 1>(0);
	const inDay = (value: Date | string | null, offset: number) => {
		if (!value) return false;
		const t = new Date(value).getTime();
		return t >= startOfDay(offset) && t < startOfDay(offset + 1);
	};

	const orders = $derived(
		data.mode === 'business' ? data.orders.filter((o) => inDay(o.pickupFrom, day)) : []
	);
	const gifts = $derived(
		data.mode === 'business' ? data.charityPickups.filter((p) => inDay(p.from, day)) : []
	);
	const dayCount = (offset: number) =>
		data.mode === 'business'
			? data.orders.filter((o) => o.status === 'active' && inDay(o.pickupFrom, offset)).length
			: 0;

	/** What to pack: still-open orders grouped by offer. */
	const packing = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local lookup, rebuilt on every run
		const byOffer = new Map<
			string,
			{ name: string; description: string; count: number; first: Date }
		>();
		for (const o of orders) {
			if (o.status !== 'active') continue;
			const entry = byOffer.get(o.offerId) ?? {
				name: o.offerName,
				description: o.offerDescription,
				count: 0,
				first: new Date(o.pickupFrom)
			};
			entry.count++;
			if (new Date(o.pickupFrom) < entry.first) entry.first = new Date(o.pickupFrom);
			byOffer.set(o.offerId, entry);
		}
		return [...byOffer.values()].sort((a, b) => a.first.getTime() - b.first.getTime());
	});

	// --- Redeeming -------------------------------------------------------------
	let scanning = $state(false);
	let verifying = $state(false);
	let result = $state<{ ok: boolean; title: string; detail?: string } | null>(null);
	let digitsFor = $state<string | null>(null);
	let digits = $state('');

	async function redeem(fields: Record<string, string>) {
		verifying = true;
		const body = new FormData();
		for (const [k, v] of Object.entries(fields)) body.set(k, v);
		const response = await fetch(`?/redeem${page.url.search.replace(/^\?/, '&')}`, {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true', accept: 'application/json' }
		});
		const outcome = deserialize(await response.text());
		verifying = false;
		if (outcome.type === 'success') {
			const r = outcome.data?.redeem as { offerName: string; collector: string };
			result = { ok: true, title: 'Hand it over', detail: `${r.offerName} · ${r.collector}` };
			navigator.vibrate?.([30, 40, 30]);
			digitsFor = null;
			digits = '';
			await invalidateAll();
		} else {
			const r = outcome.type === 'failure' ? (outcome.data?.redeem as { error?: string }) : null;
			result = {
				ok: false,
				title: 'Do not hand over',
				detail: r?.error ?? 'Something went wrong.'
			};
			navigator.vibrate?.([200]);
		}
	}

	function onscan(value: string) {
		if (verifying || result) return;
		redeem({ code: value });
	}

	let processingId = $state<string | null>(null);
	function busy(id: string) {
		return () => {
			processingId = id;
			return async ({ update }: { update: () => Promise<void> }) => {
				processingId = null;
				await update();
			};
		};
	}
</script>

{#if data.mode === 'business'}
	<BaseLayout
		title={data.location.name}
		description="{data.location.address}, {data.location.city}{data.staffName
			? ` · ${data.staffName}`
			: ''}"
		icon={IconBag}
	>
		{#snippet actions()}
			<button class="btn gap-2 btn-primary" onclick={() => ((scanning = true), (result = null))}>
				<IconScan class="size-5" /> Scan
			</button>
		{/snippet}

		{#if data.isOwner && data.locations.length > 1}
			<select
				class="select-bordered select mb-4 w-full sm:w-auto"
				value={data.location.id}
				onchange={(e) =>
					goto(withSearch(resolve('/(dock)/shift'), { location: e.currentTarget.value }), {
						replaceState: true
					})}
				aria-label="Location"
			>
				{#each data.locations as loc (loc.id)}
					<option value={loc.id}>{loc.name}</option>
				{/each}
			</select>
		{/if}

		{#if result && !scanning}
			<div class="mb-4 alert {result.ok ? 'alert-success' : 'alert-error'}">
				{#if result.ok}<IconCheck class="size-6 shrink-0" />{:else}<IconDismiss
						class="size-6 shrink-0"
					/>{/if}
				<div>
					<p class="font-bold">{result.title}</p>
					{#if result.detail}<p class="text-sm">{result.detail}</p>{/if}
				</div>
				<button class="btn btn-ghost btn-sm" onclick={() => (result = null)}>OK</button>
			</div>
		{/if}

		<div role="tablist" class="tabs tabs-box mb-6 w-full sm:w-auto">
			{#each [0, 1] as const as offset (offset)}
				<button
					role="tab"
					class="tab flex-1 gap-2 {day === offset ? 'tab-active' : ''}"
					onclick={() => (day = offset)}
				>
					{offset === 0 ? 'Today' : 'Tomorrow'}
					<span class="badge badge-sm">{dayCount(offset)}</span>
				</button>
			{/each}
		</div>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
			<section class="lg:col-span-2">
				<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
					<IconBox class="size-5 text-primary" /> To pack
				</h2>
				{#if packing.length === 0 && gifts.filter((g) => g.status === 'accepted').length === 0}
					<p
						class="rounded-2xl border border-dashed border-base-300 p-5 text-sm text-base-content/60"
					>
						Nothing to pack {day === 0 ? 'today' : 'tomorrow'} so far.
					</p>
				{:else}
					<ul class="space-y-2">
						{#each packing as item (item.name)}
							<li
								class="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-3"
							>
								<span
									class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl font-extrabold text-primary tabular-nums"
								>
									{item.count}
								</span>
								<div class="min-w-0">
									<p class="truncate font-semibold">{item.name}</p>
									<p class="line-clamp-2 text-xs text-base-content/60">{item.description}</p>
									<p class="text-xs text-base-content/60">first pickup {formatClock(item.first)}</p>
								</div>
							</li>
						{/each}
						{#each gifts.filter((g) => g.status === 'accepted') as gift (gift.id)}
							<li
								class="flex items-center gap-3 rounded-2xl border border-secondary/40 bg-base-100 p-3"
							>
								<span
									class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary"
								>
									<IconHeart class="size-6" />
								</span>
								<div class="min-w-0">
									<p class="truncate font-semibold">
										Donation for {gift.charityName}
									</p>
									<p class="line-clamp-2 text-xs text-base-content/60">
										{gift.foodType && isFoodType(gift.foodType)
											? `${FOOD_TYPE_LABELS[gift.foodType]} · `
											: ''}{gift.message}
									</p>
									{#if gift.from}<p class="text-xs text-base-content/60">
											collected {formatClock(gift.from)}
										</p>{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="lg:col-span-3">
				<h2 class="mb-3 text-lg font-semibold">Orders</h2>
				{#if orders.length === 0}
					<p
						class="rounded-2xl border border-dashed border-base-300 p-5 text-sm text-base-content/60"
					>
						No orders {day === 0 ? 'today' : 'tomorrow'} yet.
					</p>
				{:else}
					<ul class="space-y-2">
						{#each orders as order (order.id)}
							<li class="rounded-2xl border border-base-300 bg-base-100 p-3">
								<div class="flex items-center gap-3">
									<div class="w-24 shrink-0 text-sm font-semibold tabular-nums">
										{formatClock(order.pickupFrom)}–{formatClock(order.pickupUntil)}
									</div>
									<div class="min-w-0 flex-1">
										<p class="truncate font-medium">{order.offerName}</p>
										<p class="truncate text-xs text-base-content/60">
											#{order.ref}{order.charityName ? ` · ${order.charityName}` : ''}
										</p>
									</div>
									{#if order.status === 'active'}
										<button
											class="btn gap-1 btn-ghost btn-sm"
											onclick={() => (
												(digitsFor = digitsFor === order.id ? null : order.id),
												(digits = ''),
												(result = null)
											)}
										>
											<IconKeyboard class="size-4" /> Code
										</button>
									{:else}
										<StatusBadge map={RESERVATION_STATUS} status={order.status} />
									{/if}
								</div>
								{#if digitsFor === order.id}
									<form
										class="mt-3 flex gap-2"
										onsubmit={(e) => {
											e.preventDefault();
											redeem({ reservationId: order.id, digits });
										}}
									>
										<input
											class="input-bordered input flex-1 font-mono tracking-widest"
											inputmode="numeric"
											autocomplete="one-time-code"
											maxlength="6"
											placeholder="6 digits from their app"
											bind:value={digits}
										/>
										<button class="btn btn-primary" disabled={digits.length !== 6 || verifying}
											>Check</button
										>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}

				{#if gifts.length > 0}
					<h2 class="mt-6 mb-3 text-lg font-semibold">Charity pickups</h2>
					<ul class="space-y-2">
						{#each gifts as gift (gift.id)}
							<li
								class="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-3"
							>
								<div class="w-24 shrink-0 text-sm font-semibold tabular-nums">
									{#if gift.from && gift.until}{formatClock(gift.from)}–{formatClock(
											gift.until
										)}{/if}
								</div>
								<div class="min-w-0 flex-1">
									<p class="flex items-center gap-1 truncate font-medium">
										{#if gift.recurring}<IconRepeat class="size-4 text-primary" />{/if}
										{gift.charityName}
									</p>
									<p class="truncate text-xs text-base-content/60">{gift.message}</p>
								</div>
								{#if gift.status === 'accepted'}
									<form
										method="POST"
										action="?/handOver{page.url.search.replace(/^\?/, '&')}"
										use:enhance={busy(gift.id)}
									>
										<input type="hidden" name="pickupId" value={gift.id} />
										<button class="btn btn-outline btn-sm" disabled={processingId === gift.id}
											>Handed over</button
										>
									</form>
								{:else}
									<StatusBadge map={PICKUP_STATUS} status={gift.status} />
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>
	</BaseLayout>

	<Modal bind:open={scanning} title="Scan pickup code" position="bottom" size="small">
		<div class="space-y-4">
			<QrScanner {onscan} paused={verifying || !!result} />
			{#if verifying}
				<p class="flex items-center justify-center gap-2 text-sm">
					<span class="loading loading-sm loading-spinner"></span> Checking…
				</p>
			{:else if result}
				<div
					class="rounded-2xl p-4 text-center {result.ok
						? 'bg-success text-success-content'
						: 'bg-error text-error-content'}"
				>
					{#if result.ok}<IconCheck class="mx-auto size-10" />{:else}<IconDismiss
							class="mx-auto size-10"
						/>{/if}
					<p class="mt-1 text-lg font-extrabold">{result.title}</p>
					{#if result.detail}<p class="text-sm">{result.detail}</p>{/if}
				</div>
				<button class="btn btn-block btn-primary" onclick={() => (result = null)}>Scan next</button>
			{:else}
				<p class="text-center text-sm text-base-content/60">
					Point the camera at the code in the customer's app. Every code is checked with the server.
				</p>
			{/if}
		</div>
	</Modal>
{:else}
	<BaseLayout
		title="Pickups"
		description="{data.organisation}{data.staffName
			? ` · ${data.staffName}`
			: ''} — food to collect this week"
		icon={IconHeart}
	>
		{#if data.pickups.length === 0}
			<p class="rounded-2xl border border-dashed border-base-300 p-6 text-sm text-base-content/60">
				No pickups scheduled for the next 7 days.
			</p>
		{:else}
			<ul class="space-y-3">
				{#each data.pickups as pickup (pickup.id)}
					<li class="card border border-base-300 bg-base-100 shadow-sm">
						<div class="card-body gap-3 p-4">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="font-semibold">
										{pickup.from && pickup.until
											? formatPickupWindow(pickup.from, pickup.until)
											: 'Time to be agreed'}
									</p>
									<p class="flex items-center gap-1 text-sm text-base-content/70">
										{#if pickup.recurring}<IconRepeat class="size-4 text-primary" />{/if}
										{pickup.businessName}
									</p>
								</div>
								<form method="POST" action="?/markCollected" use:enhance={busy(pickup.id)}>
									<input type="hidden" name="pickupId" value={pickup.id} />
									<button
										class="btn gap-1 btn-sm btn-success"
										disabled={processingId === pickup.id}
									>
										<IconCheck class="size-4" /> Collected
									</button>
								</form>
							</div>
							{#if pickup.address}
								<a
									class="flex link items-center gap-1.5 text-sm"
									target="_blank"
									rel="noopener"
									href="https://www.openstreetmap.org/?mlat={pickup.latitude}&mlon={pickup.longitude}#map=18/{pickup.latitude}/{pickup.longitude}"
								>
									<IconLocation class="size-4" />{pickup.locationName}, {pickup.address}, {pickup.city}
								</a>
							{/if}
							<p class="text-sm text-base-content/70">
								{pickup.foodType && isFoodType(pickup.foodType)
									? `${FOOD_TYPE_LABELS[pickup.foodType]} · `
									: ''}{pickup.message}
							</p>
							{#if pickup.reservationId && pickup.claimToken && pickup.reservationStatus === 'active'}
								<details class="rounded-xl bg-base-200/60 p-3">
									<summary class="cursor-pointer text-sm font-semibold">Show pickup code</summary>
									<div class="mt-3">
										<PickupQr
											reservationId={pickup.reservationId}
											claimToken={pickup.claimToken}
											serverNow={data.serverNow}
										/>
									</div>
								</details>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</BaseLayout>
{/if}
