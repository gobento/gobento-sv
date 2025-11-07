<!-- src/routes/(dock)/transactions/+page.svelte -->
<script lang="ts">
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import IconCheckmarkCircle from '~icons/fluent/checkmark-circle-24-filled';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconDismissCircle from '~icons/fluent/dismiss-circle-24-regular';
	import IconWarning from '~icons/fluent/warning-24-regular';
	import IconMoneyHand from '~icons/fluent/money-hand-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconChevronDown from '~icons/fluent/chevron-down-24-regular';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// todo: make it possible for businesses to download pdf receipts for settlements and all the offers bouught during the month, including the date of each.
	// this should make it possible for the irs to properly tax the business.

	function formatCurrency(amount: number, currency: string = 'EUR'): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency
		}).format(amount);
	}

	function formatMonth(month: string, year: number): string {
		const date = new Date(year, parseInt(month) - 1);
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}

	function getStatusBadge(status: string) {
		const statusMap = {
			pending: { class: 'badge-warning', icon: IconClock, text: 'Pending' },
			processing: { class: 'badge-info', icon: IconClock, text: 'Processing' },
			paid: { class: 'badge-success', icon: IconCheckmarkCircle, text: 'Paid' },
			failed: { class: 'badge-error', icon: IconDismissCircle, text: 'Failed' },
			partially_paid: { class: 'badge-warning', icon: IconWarning, text: 'Partially Paid' }
		};
		return statusMap[status as keyof typeof statusMap] || statusMap.pending;
	}

	function getPaymentMethodBadge(method: string) {
		return method === 'iban'
			? { class: 'badge-primary', text: 'Bank Transfer' }
			: { class: 'badge-accent', text: 'USDT' };
	}

	let expandedSettlements = $state<Set<string>>(new Set());

	function toggleSettlement(id: string) {
		const newExpanded = new Set(expandedSettlements);
		if (newExpanded.has(id)) {
			newExpanded.delete(id);
		} else {
			newExpanded.add(id);
		}
		expandedSettlements = newExpanded;
	}
</script>

<BaseLayout
	title="Monthly Settlements"
	description="View and track your monthly payment settlements"
	icon={IconMoneyHand}
>
	<!-- Summary Cards -->
	<div class="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-figure text-warning">
					<IconMoneyHand class="size-8" />
				</div>
				<div class="stat-title">Pending Bank Transfer</div>
				<div class="stat-value text-2xl">
					{formatCurrency(data.summary.totalPendingIban, data.wallet?.ibanCurrency || 'EUR')}
				</div>
				<div class="stat-desc">{data.summary.pendingSettlements} pending settlements</div>
			</div>
		</div>

		<div class="stats shadow">
			<div class="stat">
				<div class="stat-figure text-accent">
					<IconMoneyHand class="size-8" />
				</div>
				<div class="stat-title">Pending USDT</div>
				<div class="stat-value text-2xl">
					{formatCurrency(data.summary.totalPendingTether, 'USD')}
				</div>
				<div class="stat-desc">Tether payments</div>
			</div>
		</div>

		<div class="stats shadow">
			<div class="stat">
				<div class="stat-figure text-success">
					<IconCheckmarkCircle class="size-8" />
				</div>
				<div class="stat-title">Total Paid (Bank)</div>
				<div class="stat-value text-2xl">
					{formatCurrency(data.summary.totalPaidIban, data.wallet?.ibanCurrency || 'EUR')}
				</div>
				<div class="stat-desc">All-time bank transfers</div>
			</div>
		</div>

		<div class="stats shadow">
			<div class="stat">
				<div class="stat-figure text-success">
					<IconCheckmarkCircle class="size-8" />
				</div>
				<div class="stat-title">Total Paid (USDT)</div>
				<div class="stat-value text-2xl">
					{formatCurrency(data.summary.totalPaidTether, 'USD')}
				</div>
				<div class="stat-desc">All-time USDT payments</div>
			</div>
		</div>
	</div>

	<!-- Settlements List -->
	<div class="space-y-4">
		{#if data.settlements.length === 0}
			<div class="alert">
				<IconCalendar class="size-6" />
				<span>No settlements yet. Settlements are generated monthly for completed payments.</span>
			</div>
		{:else}
			{#each data.settlements as settlement}
				{@const statusBadge = getStatusBadge(settlement.status)}
				{@const isExpanded = expandedSettlements.has(settlement.id)}

				<div class="card bg-base-200 shadow-lg">
					<div class="card-body">
						<!-- Settlement Header -->
						<div class="flex flex-wrap items-center justify-between gap-4">
							<div class="flex items-center gap-3">
								<IconCalendar class="size-6 text-primary" />
								<div>
									<h3 class="text-xl font-bold">
										{formatMonth(settlement.month, settlement.year)}
									</h3>
									<p class="text-sm text-base-content/60">
										Settlement ID: {settlement.id.slice(0, 8)}...
									</p>
								</div>
							</div>

							<div class="flex items-center gap-2">
								<span class="badge {statusBadge.class} gap-2">
									<statusBadge.icon class="size-4" />
									{statusBadge.text}
								</span>
							</div>
						</div>

						<!-- Settlement Summary -->
						<div class="mt-4 grid gap-4 md:grid-cols-2">
							<!-- Bank Transfer Summary -->
							{#if settlement.ibanPaymentCount > 0}
								<div class="rounded-lg bg-base-300 p-4">
									<div class="mb-2 flex items-center gap-2">
										<span class="badge badge-primary">Bank Transfer</span>
										<span class="text-sm text-base-content/60">
											{settlement.ibanPaymentCount} payments
										</span>
									</div>
									<div class="text-2xl font-bold">
										{formatCurrency(settlement.ibanTotalAmount, settlement.ibanCurrency || 'EUR')}
									</div>
									{#if settlement.ibanPaidAt}
										<div class="mt-2 text-xs text-success">
											<IconCheckmarkCircle class="inline size-4" />
											Paid on {new Date(settlement.ibanPaidAt).toLocaleDateString()}
										</div>
										{#if settlement.ibanTransactionRef}
											<div class="text-xs text-base-content/60">
												Ref: {settlement.ibanTransactionRef}
											</div>
										{/if}
									{/if}
									{#if settlement.ibanPayoutError}
										<div class="mt-2 text-xs text-error">
											<IconDismissCircle class="inline size-4" />
											{settlement.ibanPayoutError}
										</div>
									{/if}
								</div>
							{/if}

							<!-- Tether Summary -->
							{#if settlement.tetherPaymentCount > 0}
								<div class="rounded-lg bg-base-300 p-4">
									<div class="mb-2 flex items-center gap-2">
										<span class="badge badge-accent">USDT</span>
										<span class="text-sm text-base-content/60">
											{settlement.tetherPaymentCount} payments
										</span>
									</div>
									<div class="text-2xl font-bold">
										{formatCurrency(settlement.tetherTotalAmount, 'USD')}
									</div>
									{#if settlement.tetherPaidAt}
										<div class="mt-2 text-xs text-success">
											<IconCheckmarkCircle class="inline size-4" />
											Paid on {new Date(settlement.tetherPaidAt).toLocaleDateString()}
										</div>
										{#if settlement.tetherTxHash}
											<div class="text-xs text-base-content/60">
												TX: {settlement.tetherTxHash.slice(0, 10)}...
											</div>
										{/if}
									{/if}
									{#if settlement.tetherPayoutError}
										<div class="mt-2 text-xs text-error">
											<IconDismissCircle class="inline size-4" />
											{settlement.tetherPayoutError}
										</div>
									{/if}
								</div>
							{/if}
						</div>

						<!-- Notes -->
						{#if settlement.notes}
							<div class="mt-4 rounded-lg bg-base-300 p-3 text-sm">
								<strong>Notes:</strong>
								{settlement.notes}
							</div>
						{/if}

						<!-- Toggle Payment Details -->
						<div class="mt-4 card-actions justify-end">
							<button
								class="btn gap-2 btn-ghost btn-sm"
								onclick={() => toggleSettlement(settlement.id)}
							>
								View {settlement.payments.length} Payments
								<IconChevronDown
									class="size-4 transition-transform {isExpanded ? 'rotate-180' : ''}"
								/>
							</button>
						</div>

						<!-- Payment Details (Expandable) -->
						{#if isExpanded && settlement.payments.length > 0}
							<div class="mt-4 overflow-x-auto">
								<table class="table table-zebra table-sm">
									<thead>
										<tr>
											<th>Payment ID</th>
											<th>Method</th>
											<th>Amount</th>
											<th>Completed</th>
											<th>Status</th>
										</tr>
									</thead>
									<tbody>
										{#each settlement.payments as payment}
											{@const methodBadge = getPaymentMethodBadge(payment.paymentMethod)}
											<tr>
												<td class="font-mono text-xs">
													{payment.paymentId.slice(0, 8)}...
												</td>
												<td>
													<span class="badge {methodBadge.class} badge-sm">
														{methodBadge.text}
													</span>
												</td>
												<td class="font-semibold">
													{formatCurrency(payment.businessAmount, payment.currency)}
												</td>
												<td class="text-xs">
													{payment.completedAt
														? new Date(payment.completedAt).toLocaleString()
														: 'N/A'}
												</td>
												<td>
													<span class="badge badge-xs">
														{payment.status}
													</span>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</BaseLayout>
