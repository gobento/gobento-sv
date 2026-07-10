<!-- src/routes/(dock)/admin/payments/+page.svelte -->
<script lang="ts">
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import IconReceipt from '~icons/fluent/receipt-24-filled';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const outcomeBadge: Record<string, string> = {
		initiated: 'badge-info',
		redirected: 'badge-info',
		switched: 'badge-warning',
		failed: 'badge-error',
		cancelled: 'badge-neutral',
		completed: 'badge-success'
	};

	function formatDateTime(date: Date | string): string {
		return new Date(date).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatAmount(amount: number | null, currency: string | null): string {
		if (amount == null) return '—';
		if (!currency) return amount.toFixed(2);
		try {
			return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
		} catch {
			return `${amount.toFixed(2)} ${currency}`;
		}
	}
</script>

<BaseLayout
	title="Payment Log"
	description="Full log of every payment option a user or business attempted"
	icon={IconReceipt}
>
	<form method="GET" class="mb-6 flex flex-wrap items-end gap-2">
		<label class="form-control">
			<span class="label-text mb-1">Email</span>
			<input
				type="search"
				name="q"
				value={data.filters.q}
				placeholder="user or business email…"
				class="input input-bordered"
			/>
		</label>
		<label class="form-control">
			<span class="label-text mb-1">Outcome</span>
			<select name="outcome" class="select select-bordered">
				<option value="">All outcomes</option>
				{#each data.outcomes as o (o)}
					<option value={o} selected={data.filters.outcome === o}>{o}</option>
				{/each}
			</select>
		</label>
		<label class="form-control">
			<span class="label-text mb-1">Method</span>
			<select name="method" class="select select-bordered">
				<option value="">All methods</option>
				{#each data.methods as mth (mth)}
					<option value={mth} selected={data.filters.method === mth}>
						{mth === 'iban' ? 'Bank / IBAN' : 'USDT'}
					</option>
				{/each}
			</select>
		</label>
		<button type="submit" class="btn btn-primary">Filter</button>
		<a href="/admin/payments" class="btn btn-ghost">Reset</a>
	</form>

	{#if data.truncated}
		<div class="alert alert-warning mb-4">
			Showing the most recent 300 attempts. Use the filters to narrow the results.
		</div>
	{/if}

	<div class="overflow-x-auto rounded-box border border-base-300">
		<table class="table table-sm">
			<thead>
				<tr>
					<th>When</th>
					<th>User</th>
					<th>Business</th>
					<th>Offer</th>
					<th>Method</th>
					<th>Amount</th>
					<th>Outcome</th>
					<th>Reason</th>
				</tr>
			</thead>
			<tbody>
				{#each data.attempts as a (a.id)}
					<tr class="align-top">
						<td class="whitespace-nowrap text-xs text-base-content/70"
							>{formatDateTime(a.createdAt)}</td
						>
						<td class="text-sm">{a.userEmail ?? '—'}</td>
						<td class="text-sm">{a.businessEmail ?? '—'}</td>
						<td class="text-sm">{a.offerName ?? '—'}</td>
						<td>
							<span
								class="badge badge-sm {a.paymentMethod === 'iban'
									? 'badge-primary'
									: 'badge-accent'}"
							>
								{a.paymentMethod === 'iban' ? 'Bank / IBAN' : 'USDT'}
							</span>
						</td>
						<td class="whitespace-nowrap text-sm">{formatAmount(a.amount, a.currency)}</td>
						<td>
							<span class="badge badge-sm {outcomeBadge[a.outcome] ?? 'badge-neutral'}"
								>{a.outcome}</span
							>
							{#if a.isMock}
								<span class="badge badge-ghost badge-xs">mock</span>
							{/if}
						</td>
						<td class="max-w-xs text-xs text-base-content/60">{a.reason ?? ''}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="8" class="text-center text-base-content/50">No payment attempts found</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</BaseLayout>
