<!-- A scheduled donation pickup, with its optional pickup code and actions. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import PickupQr from '#lib/components/reservations/PickupQr.svelte';
	import { formatPickupWindow } from '#lib/components/reservations/pickup.js';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';

	export interface UpcomingPickup {
		businessName: string;
		logoUrl: string;
		message: string;
		locationName: string | null;
		locationAddress: string | null;
		proposedPickupFrom: string | Date | null;
		proposedPickupUntil: string | Date | null;
		recurringGiftId: string | null;
		reservationId: string | null;
		reservationClaimToken: string | null;
		reservationStatus: string | null;
	}

	interface Props {
		req: UpcomingPickup;
		serverNow: number;
		actions: Snippet;
	}

	let { req, serverNow, actions }: Props = $props();
</script>

<Card padding="sm">
	<div class="flex items-start gap-3">
		<div class="avatar">
			<div class="w-10 rounded-xl ring ring-base-300">
				<img src={req.logoUrl} alt={req.businessName} />
			</div>
		</div>
		<div class="min-w-0 flex-1">
			<h3 class="font-semibold">
				{#if req.proposedPickupFrom && req.proposedPickupUntil}
					{formatPickupWindow(req.proposedPickupFrom, req.proposedPickupUntil)}
				{:else}
					Time to be agreed
				{/if}
			</h3>
			<p class="text-sm text-base-content/70">
				{req.businessName}{#if req.locationName}
					· {req.locationName}{req.locationAddress ? `, ${req.locationAddress}` : ''}{/if}
			</p>
		</div>
		{#if req.recurringGiftId}
			<span class="badge gap-1 badge-outline badge-sm badge-primary"
				><IconRepeat class="size-3" /> Regular</span
			>
		{/if}
	</div>
	<p class="text-sm text-base-content/70">{req.message}</p>
	{#if req.reservationId && req.reservationClaimToken && req.reservationStatus === 'active'}
		<details class="rounded-xl bg-base-200/60 p-3">
			<summary class="cursor-pointer text-sm font-semibold">Show pickup code</summary>
			<div class="mt-3">
				<PickupQr
					reservationId={req.reservationId}
					claimToken={req.reservationClaimToken}
					{serverNow}
				/>
			</div>
		</details>
	{/if}
	<div class="flex flex-wrap justify-end gap-2">
		{@render actions()}
	</div>
</Card>
