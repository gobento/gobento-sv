<!-- src/routes/(dock)/admin/+page.svelte -->
<script lang="ts">
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import IconDataBar from '~icons/fluent/data-bar-vertical-24-filled';
	import IconPeople from '~icons/fluent/people-24-regular';
	import IconMoneyHand from '~icons/fluent/money-hand-24-regular';
	import IconReceipt from '~icons/fluent/receipt-24-regular';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatUsdt(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 2
		}).format(amount);
	}

	function formatCurrency(amount: number, currency: string): string {
		try {
			return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
		} catch {
			return `${amount.toFixed(2)} ${currency}`;
		}
	}

	const statusBadge: Record<string, string> = {
		pending: 'badge-warning',
		processing: 'badge-info',
		completed: 'badge-success',
		failed: 'badge-error',
		refunded: 'badge-neutral'
	};

	const outcomeBadge: Record<string, string> = {
		initiated: 'badge-info',
		redirected: 'badge-info',
		switched: 'badge-warning',
		failed: 'badge-error',
		cancelled: 'badge-neutral',
		completed: 'badge-success'
	};

	const accountTypeLabels: Record<string, string> = {
		user: 'Users',
		business: 'Businesses',
		charity: 'Charities',
		moderator: 'Moderators',
		admin: 'Admins'
	};
</script>

<BaseLayout
	title="Admin Dashboard"
	description="Platform-wide activity, revenue and payment health"
	icon={IconDataBar}
>
	<!-- Active users -->
	<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
		<IconPeople class="size-5 text-primary" /> Active users
	</h2>
	<div class="mb-8 grid gap-4 sm:grid-cols-3">
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Active sessions</div>
				<div class="stat-value text-2xl">{data.activeUsers.activeSessions}</div>
				<div class="stat-desc">Accounts with a valid login session</div>
			</div>
		</div>
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Active reservations</div>
				<div class="stat-value text-2xl">{data.activeUsers.activeReservations}</div>
				<div class="stat-desc">Users with an active reservation</div>
			</div>
		</div>
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Active last 30 days</div>
				<div class="stat-value text-2xl">{data.activeUsers.recent30d}</div>
				<div class="stat-desc">Reserved or paid recently</div>
			</div>
		</div>
	</div>

	<!-- Accounts by type -->
	<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Total accounts</div>
				<div class="stat-value text-2xl">{data.accounts.total}</div>
			</div>
		</div>
		{#each data.accounts.byType as row (row.type)}
			<div class="stats shadow">
				<div class="stat">
					<div class="stat-title">{accountTypeLabels[row.type] ?? row.type}</div>
					<div class="stat-value text-2xl">{row.count}</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Transaction volume -->
	<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
		<IconMoneyHand class="size-5 text-primary" /> Transactions
	</h2>
	<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Volume (all-time)</div>
				<div class="stat-value text-2xl">{formatUsdt(data.transactions.completedVolumeUsdt)}</div>
				<div class="stat-desc">{data.transactions.completedCount} completed payments</div>
			</div>
		</div>
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Volume (30 days)</div>
				<div class="stat-value text-2xl">
					{formatUsdt(data.transactions.completedVolumeUsdt30d)}
				</div>
				<div class="stat-desc">{data.transactions.completedCount30d} completed payments</div>
			</div>
		</div>
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Pending payouts (IBAN)</div>
				<div class="stat-value text-2xl">{formatUsdt(data.payouts.pendingIban)}</div>
				<div class="stat-desc">{data.payouts.pendingCount} open settlements</div>
			</div>
		</div>
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">Pending payouts (USDT)</div>
				<div class="stat-value text-2xl">{formatUsdt(data.payouts.pendingTether)}</div>
				<div class="stat-desc">Awaiting monthly batch</div>
			</div>
		</div>
	</div>

	<div class="mb-8 grid gap-6 lg:grid-cols-2">
		<!-- By status -->
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h3 class="card-title text-base">Payments by status</h3>
				<div class="flex flex-wrap gap-2">
					{#each data.transactions.byStatus as row (row.status)}
						<span class="badge {statusBadge[row.status] ?? 'badge-neutral'} badge-lg gap-1">
							{row.status}: <strong>{row.count}</strong>
						</span>
					{:else}
						<span class="text-base-content/50">No payments yet</span>
					{/each}
				</div>
			</div>
		</div>

		<!-- By method -->
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h3 class="card-title text-base">Payments by method</h3>
				<div class="flex flex-wrap gap-4">
					{#each data.transactions.byMethod as row (row.method)}
						<div>
							<div class="font-medium capitalize">
								{row.method === 'iban' ? 'Bank Transfer' : 'USDT'}
							</div>
							<div class="text-sm text-base-content/60">
								{row.count} payments · {formatUsdt(row.usdt)}
							</div>
						</div>
					{:else}
						<span class="text-base-content/50">No payments yet</span>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Completed by currency -->
	{#if data.transactions.currencyBreakdown.length > 0}
		<div class="mb-8 card bg-base-100 shadow">
			<div class="card-body">
				<h3 class="card-title text-base">Completed revenue by currency</h3>
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr>
								<th>Currency</th>
								<th class="text-right">Payments</th>
								<th class="text-right">Gross</th>
								<th class="text-right">Platform fees</th>
								<th class="text-right">Paid to business</th>
							</tr>
						</thead>
						<tbody>
							{#each data.transactions.currencyBreakdown as row (row.currency)}
								<tr>
									<td class="font-medium">{row.currency}</td>
									<td class="text-right">{row.count}</td>
									<td class="text-right">{formatCurrency(row.gross, row.currency)}</td>
									<td class="text-right text-success">{formatCurrency(row.fees, row.currency)}</td>
									<td class="text-right">{formatCurrency(row.business, row.currency)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}

	<!-- Payment attempts log summary -->
	<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
		<IconReceipt class="size-5 text-primary" /> Payment attempts
	</h2>
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<p class="text-sm text-base-content/60">
				{data.attempts.total} logged attempts across every payment option tried.
				<a href="/admin/payments" class="link link-primary">View full log →</a>
			</p>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each data.attempts.byOutcome as row (row.outcome)}
					<span class="badge {outcomeBadge[row.outcome] ?? 'badge-neutral'} badge-lg gap-1">
						{row.outcome}: <strong>{row.count}</strong>
					</span>
				{:else}
					<span class="text-base-content/50">No attempts logged yet</span>
				{/each}
			</div>
		</div>
	</div>
</BaseLayout>
