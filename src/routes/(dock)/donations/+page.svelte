<!-- src/routes/(dock)/donations/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import { FOOD_TYPE_LABELS, isFoodType } from '$lib/foodTypes';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconCheck from '~icons/fluent/checkmark-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let processingId = $state<string | null>(null);

	const statusBadge: Record<string, string> = {
		pending: 'badge-warning',
		accepted: 'badge-success',
		declined: 'badge-error',
		cancelled: 'badge-ghost',
		completed: 'badge-info'
	};

	function formatDate(value: string | Date | null): string {
		if (!value) return '';
		return new Date(value).toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}

	const pending = $derived(data.requests.filter((r) => r.status === 'pending'));
	const answered = $derived(data.requests.filter((r) => r.status !== 'pending'));
</script>

<BaseLayout
	title="Donations"
	description="Pickup requests from businesses with surplus food to give away"
	icon={IconHeart}
>
	{#if data.requests.length === 0}
		<div class="rounded-2xl border border-base-300 bg-base-100 p-10 text-center">
			<IconHeart class="mx-auto mb-3 size-10 opacity-30" />
			<p class="font-medium">No pickup requests yet</p>
			<p class="text-sm text-base-content/60">
				When a business asks you to collect surplus food, it will appear here.
			</p>
		</div>
	{:else}
		{#if pending.length > 0}
			<h2 class="mb-3 text-lg font-semibold">Pending requests</h2>
			<div class="mb-8 space-y-4">
				{#each pending as req (req.id)}
					<div class="card border border-base-300 bg-base-100 shadow-sm">
						<div class="card-body gap-4">
							<div class="flex items-start gap-3">
								<div class="avatar">
									<div class="w-12 rounded-xl ring ring-base-300">
										<img src={req.logoUrl} alt={req.businessName} />
									</div>
								</div>
								<div class="min-w-0 flex-1">
									<h3 class="font-semibold">{req.businessName}</h3>
									<p class="text-xs text-base-content/60">Requested {formatDate(req.createdAt)}</p>
								</div>
								<span class="badge {statusBadge[req.status]} badge-sm capitalize">{req.status}</span
								>
							</div>

							<p class="text-sm text-base-content/80">{req.message}</p>

							<div class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-base-content/70">
								{#if req.foodType && isFoodType(req.foodType)}
									<span class="inline-flex items-center gap-1.5">
										<IconTag class="size-4" />
										{FOOD_TYPE_LABELS[req.foodType]}
									</span>
								{/if}
								{#if req.offerName}
									<span class="inline-flex items-center gap-1.5">
										<IconTag class="size-4" />
										{req.offerName}
									</span>
								{/if}
								{#if req.locationName}
									<span class="inline-flex items-center gap-1.5">
										<IconLocation class="size-4" />
										{req.locationName}{req.locationCity ? `, ${req.locationCity}` : ''}
									</span>
								{/if}
								{#if req.proposedPickupFrom}
									<span class="inline-flex items-center gap-1.5">
										<IconClock class="size-4" />
										{formatDate(req.proposedPickupFrom)}
										{#if req.proposedPickupUntil}– {formatDate(req.proposedPickupUntil)}{/if}
									</span>
								{/if}
							</div>

							<div class="card-actions justify-end">
								<form
									method="POST"
									action="?/declineRequest"
									use:enhance={() => {
										processingId = req.id;
										return async ({ update }) => {
											processingId = null;
											await update();
										};
									}}
								>
									<input type="hidden" name="requestId" value={req.id} />
									<button
										type="submit"
										class="btn gap-2 btn-ghost btn-sm"
										disabled={processingId === req.id}
									>
										<IconDismiss class="size-4" />
										Decline
									</button>
								</form>
								<form
									method="POST"
									action="?/acceptRequest"
									use:enhance={() => {
										processingId = req.id;
										return async ({ update }) => {
											processingId = null;
											await update();
										};
									}}
								>
									<input type="hidden" name="requestId" value={req.id} />
									<button
										type="submit"
										class="btn gap-2 btn-sm btn-primary"
										disabled={processingId === req.id}
									>
										{#if processingId === req.id}
											<span class="loading loading-xs loading-spinner"></span>
										{:else}
											<IconCheck class="size-4" />
										{/if}
										Accept
									</button>
								</form>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if answered.length > 0}
			<h2 class="mb-3 text-lg font-semibold">History</h2>
			<div class="space-y-4">
				{#each answered as req (req.id)}
					<div class="card border border-base-300 bg-base-100 shadow-sm">
						<div class="card-body gap-3">
							<div class="flex items-start gap-3">
								<div class="avatar">
									<div class="w-10 rounded-xl ring ring-base-300">
										<img src={req.logoUrl} alt={req.businessName} />
									</div>
								</div>
								<div class="min-w-0 flex-1">
									<h3 class="font-semibold">{req.businessName}</h3>
									<p class="text-xs text-base-content/60">
										{req.respondedAt ? `Answered ${formatDate(req.respondedAt)}` : ''}
									</p>
								</div>
								<span class="badge {statusBadge[req.status]} badge-sm capitalize">{req.status}</span
								>
							</div>

							<p class="text-sm text-base-content/70">{req.message}</p>

							{#if req.status === 'accepted' && req.reservationClaimToken}
								<div class="rounded-xl bg-base-200/60 p-3 text-sm">
									<p class="font-medium">Collection details</p>
									{#if req.locationName}
										<p class="text-base-content/70">
											{req.locationName}{req.locationAddress ? `, ${req.locationAddress}` : ''}
										</p>
									{/if}
									{#if req.reservationPickupFrom}
										<p class="text-base-content/70">
											{formatDate(req.reservationPickupFrom)}
											{#if req.reservationPickupUntil}– {formatDate(
													req.reservationPickupUntil
												)}{/if}
										</p>
									{/if}
									<p class="mt-1 font-mono text-xs">Claim code: {req.reservationClaimToken}</p>
								</div>
							{/if}

							{#if req.status === 'declined' && req.notes}
								<p class="text-sm text-base-content/60">Note: {req.notes}</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</BaseLayout>
