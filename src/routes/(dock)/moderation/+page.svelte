<!-- src/routes/(dock)/moderation/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconShield from '~icons/fluent/shield-task-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-circle-24-regular';
	import IconBuilding from '~icons/fluent/building-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import Alert from '$lib/components/Alert.svelte';

	let { data, form } = $props();

	// Which account row is currently submitting, so we can show a spinner
	let submittingId = $state<string | null>(null);

	const pendingItems = $derived(data.items.filter((item) => item.status === 'pending'));
	const reviewedItems = $derived(data.items.filter((item) => item.status !== 'pending'));

	const formatDate = (value: string | Date) =>
		new Date(value).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
</script>

<svelte:head>
	<title>Moderation</title>
</svelte:head>

<BaseLayout
	title="Moderation"
	description="Review and approve new businesses and charities before they go live"
	icon={IconShield}
>
	{#if form?.error}
		<Alert type="error" class="mb-6">{form.error}</Alert>
	{/if}

	{#snippet reviewCard(item: (typeof data.items)[number], pending: boolean)}
		<div class="card border border-base-300 bg-base-100" class:border-warning={pending}>
			<div class="card-body gap-4 p-6">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="flex min-w-0 flex-1 items-start gap-4">
						<div
							class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-200"
						>
							{#if item.pictureUrl}
								<img src={item.pictureUrl} alt={item.name} class="size-full object-cover" />
							{:else if item.kind === 'business'}
								<IconBuilding class="size-6 text-base-content/50" />
							{:else}
								<IconHeart class="size-6 text-base-content/50" />
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<div class="mb-2 flex flex-wrap items-center gap-2">
								<span class="badge gap-1 badge-outline badge-sm capitalize">
									{#if item.kind === 'business'}
										<IconBuilding class="size-3" />
									{:else}
										<IconHeart class="size-3" />
									{/if}
									{item.kind}
								</span>
								{#if item.status === 'pending'}
									<span class="badge badge-sm badge-warning">Pending</span>
								{:else if item.status === 'verified'}
									<span class="badge gap-1 badge-sm badge-success">
										<IconCheckmark class="size-3" />
										Approved
									</span>
								{:else}
									<span class="badge gap-1 badge-sm badge-error">
										<IconDismiss class="size-3" />
										Rejected
									</span>
								{/if}
							</div>

							<h3 class="text-lg font-bold">{item.name}</h3>
							<p class="mt-1 leading-relaxed whitespace-pre-line text-base-content/80">
								{item.description}
							</p>

							<dl
								class="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-base-content/60 sm:grid-cols-2"
							>
								<div><span class="font-medium">Email:</span> {item.email}</div>
								<div><span class="font-medium">Country:</span> {item.country}</div>
								{#if item.kind === 'business'}
									<div class="capitalize">
										<span class="font-medium">Type:</span>
										{item.businessType}
									</div>
								{:else}
									<div>
										<span class="font-medium">Reg. number:</span>
										{item.registrationNumber}
									</div>
									<div><span class="font-medium">Contact:</span> {item.contactEmail}</div>
								{/if}
								<div>
									<span class="font-medium">Registered:</span>
									{formatDate(item.registeredAt)}
								</div>
							</dl>

							{#if !pending && item.notes}
								<div class="mt-3 rounded-lg bg-base-200 p-3 text-sm">
									<span class="font-medium">Reviewer note:</span>
									{item.notes}
								</div>
							{/if}
						</div>
					</div>
				</div>

				{#if pending}
					<form
						method="POST"
						class="flex flex-col gap-3 border-t border-base-200 pt-4 sm:flex-row"
						use:enhance={() => {
							submittingId = item.accountId;
							return async ({ update }) => {
								await update();
								submittingId = null;
							};
						}}
					>
						<input type="hidden" name="kind" value={item.kind} />
						<input type="hidden" name="accountId" value={item.accountId} />
						<input
							type="text"
							name="notes"
							maxlength="500"
							placeholder="Optional note (shown to the applicant, e.g. rejection reason)…"
							class="input-bordered input flex-1"
						/>
						<div class="flex gap-2">
							<button
								type="submit"
								formaction="?/reject"
								class="btn gap-2 btn-outline btn-error"
								disabled={submittingId === item.accountId}
							>
								<IconDismiss class="size-5" />
								Reject
							</button>
							<button
								type="submit"
								formaction="?/approve"
								class="btn gap-2 btn-success"
								disabled={submittingId === item.accountId}
							>
								{#if submittingId === item.accountId}
									<span class="loading loading-spinner"></span>
								{:else}
									<IconCheckmark class="size-5" />
								{/if}
								Approve
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	{/snippet}

	{#if data.items.length === 0}
		<div class="card border border-base-300 bg-base-100">
			<div class="card-body items-center py-16 text-center">
				<div class="mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-base-200">
					<IconCheckmark class="h-10 w-10 text-success" />
				</div>
				<h3 class="mb-2 text-xl font-bold">Nothing to review</h3>
				<p class="max-w-md text-base-content/60">
					New businesses and charities awaiting approval will appear here.
				</p>
			</div>
		</div>
	{:else}
		{#if data.pendingCount > 0}
			<Alert type="warn" class="mb-6">
				{data.pendingCount}
				{data.pendingCount === 1 ? 'account is' : 'accounts are'} waiting for review.
			</Alert>
		{/if}

		{#if pendingItems.length > 0}
			<h2 class="mb-4 text-lg font-semibold">Awaiting review</h2>
			<div class="mb-10 grid gap-5">
				{#each pendingItems as item (item.kind + item.accountId)}
					{@render reviewCard(item, true)}
				{/each}
			</div>
		{/if}

		{#if reviewedItems.length > 0}
			<h2 class="mb-4 text-lg font-semibold">Reviewed</h2>
			<div class="grid gap-5">
				{#each reviewedItems as item (item.kind + item.accountId)}
					{@render reviewCard(item, false)}
				{/each}
			</div>
		{/if}
	{/if}
</BaseLayout>
