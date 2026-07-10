<!-- src/routes/(dock)/admin/accounts/+page.svelte -->
<script lang="ts">
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import IconPeople from '~icons/fluent/people-24-filled';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconMail from '~icons/fluent/mail-24-regular';
	import IconStar from '~icons/fluent/star-24-filled';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const accountTypeBadge: Record<string, string> = {
		user: 'badge-neutral',
		business: 'badge-primary',
		charity: 'badge-secondary',
		moderator: 'badge-accent',
		admin: 'badge-error'
	};

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<BaseLayout
	title="Accounts"
	description="Browse accounts, contact email and configured payment details"
	icon={IconPeople}
>
	<form method="GET" class="mb-6 flex max-w-md gap-2">
		<label class="input input-bordered flex flex-1 items-center gap-2">
			<IconSearch class="size-4 opacity-60" />
			<input
				type="search"
				name="q"
				value={data.query}
				placeholder="Search by email…"
				class="grow"
			/>
		</label>
		<button type="submit" class="btn btn-primary">Search</button>
	</form>

	{#if data.truncated}
		<div class="alert alert-warning mb-4">
			Showing the first 200 results. Refine your search to narrow them down.
		</div>
	{/if}

	<div class="overflow-x-auto rounded-box border border-base-300">
		<table class="table">
			<thead>
				<tr>
					<th>Account</th>
					<th>Email</th>
					<th>Type</th>
					<th>Registered</th>
					<th>Payment details</th>
				</tr>
			</thead>
			<tbody>
				{#each data.accounts as account (account.id)}
					<tr class="align-top">
						<td class="font-medium">
							{account.displayName ?? '—'}
							<div class="text-xs text-base-content/50">{account.id.slice(0, 8)}…</div>
						</td>
						<td>
							<a href="mailto:{account.email}" class="link inline-flex items-center gap-1">
								<IconMail class="size-4 opacity-60" />
								{account.email}
							</a>
						</td>
						<td>
							<span class="badge {accountTypeBadge[account.accountType] ?? 'badge-neutral'}">
								{account.accountType}
							</span>
						</td>
						<td class="whitespace-nowrap text-sm text-base-content/70">
							{formatDate(account.createdAt)}
						</td>
						<td>
							{#if account.paymentMethods.length === 0}
								<span class="text-base-content/40">None configured</span>
							{:else}
								<div class="flex flex-col gap-2">
									{#each account.paymentMethods as pm (pm.method)}
										<div class="flex flex-col gap-1">
											<div class="flex items-center gap-2">
												<span
													class="badge badge-sm {pm.method === 'iban'
														? 'badge-primary'
														: 'badge-accent'}"
												>
													{pm.method === 'iban' ? 'Bank / IBAN' : 'USDT'}
												</span>
												{#if pm.preferred}
													<span class="inline-flex items-center gap-0.5 text-xs text-warning">
														<IconStar class="size-3" /> preferred
													</span>
												{/if}
												{#if pm.enabled}
													<span class="badge badge-ghost badge-xs">enabled</span>
												{/if}
												{#if pm.confirmed}
													<span class="badge badge-success badge-xs">confirmed</span>
												{:else}
													<span class="badge badge-warning badge-xs">unconfirmed</span>
												{/if}
											</div>
											<code class="text-xs break-all text-base-content/70">{pm.value}</code>
										</div>
									{/each}
								</div>
							{/if}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="text-center text-base-content/50">No accounts found</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</BaseLayout>
