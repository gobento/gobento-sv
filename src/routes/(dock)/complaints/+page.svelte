<!-- src/routes/(dock)/complaints/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconWarning from '~icons/fluent/warning-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import { COMPLAINT_CATEGORY_LABELS, type ComplaintCategory } from '$lib/complaints';

	let { data, form } = $props();

	let resolvingId = $state<string | null>(null);

	const formatDate = (value: string | Date) =>
		new Date(value).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});

	const targetHref = (c: (typeof data.complaints)[number]) =>
		c.targetType === 'offer' && c.offerId
			? `/offers/${c.offerId}`
			: c.locationId
				? `/locations/${c.locationId}`
				: null;
</script>

<svelte:head>
	<title>Complaints</title>
</svelte:head>

<BaseLayout
	title="Complaints"
	description="Problems reported by customers about your offers and locations"
	icon={IconWarning}
>
	{#if form?.error}
		<Alert type="error" class="mb-6">{form.error}</Alert>
	{/if}

	{#if data.complaints.length === 0}
		<div class="card border border-base-300 bg-base-100">
			<div class="card-body items-center py-16 text-center">
				<div class="mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-base-200">
					<IconCheckmark class="h-10 w-10 text-success" />
				</div>
				<h3 class="mb-2 text-xl font-bold">No complaints</h3>
				<p class="max-w-md text-base-content/60">
					You're all caught up. Reported problems from customers will show up here.
				</p>
			</div>
		</div>
	{:else}
		{#if data.openCount > 0}
			<Alert type="warn" class="mb-6">
				You have {data.openCount} open {data.openCount === 1 ? 'complaint' : 'complaints'} to resolve.
			</Alert>
		{/if}

		<div class="grid gap-5">
			{#each data.complaints as complaint (complaint.id)}
				<div
					class="card border border-base-300 bg-base-100"
					class:border-warning={complaint.status === 'open'}
				>
					<div class="card-body p-6">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="mb-2 flex flex-wrap items-center gap-2">
									<span class="badge badge-outline badge-sm capitalize">{complaint.targetType}</span
									>
									<span class="badge badge-sm badge-neutral">
										{COMPLAINT_CATEGORY_LABELS[complaint.category as ComplaintCategory]}
									</span>
									{#if complaint.status === 'open'}
										<span class="badge badge-sm badge-warning">Open</span>
									{:else}
										<span class="badge gap-1 badge-sm badge-success">
											<IconCheckmark class="size-3" />
											Resolved
										</span>
									{/if}
								</div>

								<h3 class="text-lg font-bold">{complaint.targetName}</h3>
								<p class="mt-2 leading-relaxed whitespace-pre-line text-base-content/80">
									{complaint.message}
								</p>

								<div
									class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-base-content/50"
								>
									<span>From {complaint.reporterEmail}</span>
									<span>{formatDate(complaint.createdAt)}</span>
								</div>

								{#if complaint.status === 'resolved' && complaint.resolutionNote}
									<div class="mt-3 rounded-lg bg-base-200 p-3 text-sm">
										<span class="font-medium">Resolution note:</span>
										{complaint.resolutionNote}
									</div>
								{/if}
							</div>

							{#if targetHref(complaint)}
								<a href={targetHref(complaint)} class="btn gap-2 btn-outline btn-sm">
									View
									<IconArrowRight class="size-4" />
								</a>
							{/if}
						</div>

						{#if complaint.status === 'open'}
							<form
								method="POST"
								action="?/resolveComplaint"
								class="mt-4 border-t border-base-200 pt-4"
								use:enhance={() => {
									resolvingId = complaint.id;
									return async ({ update }) => {
										await update();
										resolvingId = null;
									};
								}}
							>
								<input type="hidden" name="complaintId" value={complaint.id} />
								<div class="flex flex-col gap-3 sm:flex-row">
									<input
										type="text"
										name="resolutionNote"
										maxlength="500"
										placeholder="Optional note about how you resolved this…"
										class="input-bordered input flex-1"
									/>
									<button
										type="submit"
										class="btn gap-2 btn-primary"
										disabled={resolvingId === complaint.id}
									>
										{#if resolvingId === complaint.id}
											<span class="loading loading-spinner"></span>
										{:else}
											<IconCheckmark class="size-5" />
										{/if}
										Mark resolved
									</button>
								</div>
							</form>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</BaseLayout>
