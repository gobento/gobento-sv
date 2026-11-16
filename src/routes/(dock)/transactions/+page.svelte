<!-- src/routes/(dock)/transactions/+page.svelte -->
<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { formatDate, formatDateTime, formatMonthYear } from '#lib/dates.js';
	import BaseLayout from '#lib/components/BaseLayout.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import StatTile from '#lib/components/ui/StatTile.svelte';
	import StatusBadge from '#lib/components/ui/StatusBadge.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import { PAYMENT_METHOD, SETTLEMENT_STATUS } from '#lib/statuses.js';
	import IconMoneyHand from '~icons/fluent/money-hand-24-regular';
	import IconCheckmarkCircle from '~icons/fluent/checkmark-circle-24-filled';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconChevronDown from '~icons/fluent/chevron-down-24-regular';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// todo: make it possible for businesses to download pdf receipts for settlements
	// and the offers bought during the month, so they can hand them to their tax advisor.

	function money(amount: number, currency: string) {
		return `${currency === 'EUR' ? '€' : ''}${amount.toLocaleString('de-DE', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		})}${currency === 'EUR' ? '' : ` ${currency}`}`;
	}

	function monthLabel(month: string, year: number) {
		return formatMonthYear(new Date(year, parseInt(month) - 1));
	}

	const expanded = new SvelteSet<string>();

	function toggle(id: string) {
		if (expanded.has(id)) expanded.delete(id);
		else expanded.add(id);
	}
</script>

<BaseLayout
	title="Payments"
	description="Monthly settlements and the payments behind them"
	icon={IconMoneyHand}
>
	<div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
		<StatTile
			label="Pending by bank"
			value={data.summary.totalPendingIban}
			decimals={2}
			prefix="€"
			icon={IconClock}
			tone="warning"
			hint="{data.summary.pendingSettlements} monthly settlements"
		/>
		<StatTile
			label="Pending USDT"
			value={data.summary.totalPendingTether}
			decimals={2}
			icon={IconClock}
			tone="accent"
			hint="Tether payouts"
		/>
		<StatTile
			label="Paid by bank"
			value={data.summary.totalPaidIban}
			decimals={2}
			prefix="€"
			icon={IconCheckmarkCircle}
			tone="success"
			hint="all time"
		/>
		<StatTile
			label="Paid USDT"
			value={data.summary.totalPaidTether}
			decimals={2}
			icon={IconCheckmarkCircle}
			tone="success"
			hint="all time"
		/>
	</div>

	{#if data.settlements.length === 0}
		<EmptyState
			icon={IconCalendar}
			title="No settlements yet"
			description="Settlements are generated monthly once payments are completed."
		/>
	{:else}
		<div class="space-y-4">
			{#each data.settlements as settlement (settlement.id)}
				{@const isExpanded = expanded.has(settlement.id)}
				<Card padding="none">
					<div class="space-y-4 p-5">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div class="flex items-center gap-3">
								<div
									class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
								>
									<IconCalendar class="size-5" />
								</div>
								<div>
									<h2 class="text-lg font-bold">{monthLabel(settlement.month, settlement.year)}</h2>
									<p class="font-mono text-xs text-base-content/50">
										{settlement.id.slice(0, 8)}
									</p>
								</div>
							</div>
							<StatusBadge map={SETTLEMENT_STATUS} status={settlement.status} />
						</div>

						<div class="grid gap-3 md:grid-cols-2">
							{#if settlement.ibanPaymentCount > 0}
								<div class="rounded-xl bg-base-200/60 p-4">
									<div class="mb-1 flex items-center gap-2">
										<StatusBadge map={PAYMENT_METHOD} status="iban" outline />
										<span class="text-xs text-base-content/60"
											>{settlement.ibanPaymentCount} payments</span
										>
									</div>
									<p class="text-xl font-bold">
										{money(settlement.ibanTotalAmount, settlement.ibanCurrency || 'EUR')}
									</p>
									{#if settlement.ibanPaidAt}
										<p class="mt-1 text-xs text-success">
											Paid on {formatDate(settlement.ibanPaidAt)}
											{#if settlement.ibanTransactionRef}· {settlement.ibanTransactionRef}{/if}
										</p>
									{/if}
									{#if settlement.ibanPayoutError}
										<p class="mt-1 text-xs text-error">{settlement.ibanPayoutError}</p>
									{/if}
								</div>
							{/if}
							{#if settlement.tetherPaymentCount > 0}
								<div class="rounded-xl bg-base-200/60 p-4">
									<div class="mb-1 flex items-center gap-2">
										<StatusBadge map={PAYMENT_METHOD} status="usdt" outline />
										<span class="text-xs text-base-content/60"
											>{settlement.tetherPaymentCount} payments</span
										>
									</div>
									<p class="text-xl font-bold">
										{money(settlement.tetherTotalAmount, 'USD')}
									</p>
									{#if settlement.tetherPaidAt}
										<p class="mt-1 text-xs text-success">
											Paid on {formatDate(settlement.tetherPaidAt)}
											{#if settlement.tetherTxHash}· {settlement.tetherTxHash.slice(0, 10)}…{/if}
										</p>
									{/if}
									{#if settlement.tetherPayoutError}
										<p class="mt-1 text-xs text-error">{settlement.tetherPayoutError}</p>
									{/if}
								</div>
							{/if}
						</div>

						{#if settlement.notes}
							<p class="rounded-xl bg-base-200/60 p-3 text-sm">
								<span class="font-semibold">Note:</span>
								{settlement.notes}
							</p>
						{/if}

						{#if settlement.payments.length > 0}
							<div class="border-t border-base-200 pt-3">
								<button
									class="btn gap-2 btn-ghost btn-sm"
									aria-expanded={isExpanded}
									onclick={() => toggle(settlement.id)}
								>
									{isExpanded ? 'Hide' : 'View'}
									{settlement.payments.length}
									{settlement.payments.length === 1 ? 'payment' : 'payments'}
									<IconChevronDown
										class="size-4 transition-transform {isExpanded ? 'rotate-180' : ''}"
									/>
								</button>
							</div>
						{/if}
					</div>

					{#if isExpanded && settlement.payments.length > 0}
						<div class="overflow-x-auto border-t border-base-200">
							<table class="table w-full table-sm">
								<thead>
									<tr>
										<th class="text-xs uppercase">Payment</th>
										<th class="text-xs uppercase">Method</th>
										<th class="text-xs uppercase">Amount</th>
										<th class="text-xs uppercase">Completed</th>
										<th class="text-xs uppercase">Status</th>
									</tr>
								</thead>
								<tbody>
									{#each settlement.payments as payment (payment.id)}
										<tr>
											<td class="font-mono text-xs">{payment.paymentId.slice(0, 8)}</td>
											<td
												><StatusBadge
													map={PAYMENT_METHOD}
													status={payment.paymentMethod}
													outline
												/></td
											>
											<td class="font-semibold"
												>{money(payment.businessAmount, payment.currency)}</td
											>
											<td class="text-xs">
												{payment.completedAt ? formatDateTime(payment.completedAt) : '—'}
											</td>
											<td class="text-xs capitalize">{payment.status}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}
</BaseLayout>
