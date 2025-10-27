<script lang="ts">
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-filled';
	import IconLock from '~icons/fluent/lock-closed-24-filled';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-filled';
	import IconDelete from '~icons/fluent/delete-24-regular';
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconWarning from '~icons/fluent/warning-24-filled';
	import IconShoppingBag from '~icons/fluent/shopping-bag-24-filled';
	import { formatTime } from '$lib/util';

	interface Props {
		// User status
		isUser: boolean;
		isOwner: boolean;

		// Offer data
		offer: {
			isActive: boolean;
			pickupTimeFrom: string;
			pickupTimeUntil: string;
		};

		// Reservation status
		userReservation?: {
			id: string;
		} | null;
		isReserved: boolean;

		// Event handlers
		onReserve: () => void;
		onDelete: () => void;
	}

	let {
		isUser,
		isOwner,
		offer,
		userReservation = null,
		isReserved,
		onReserve,
		onDelete
	}: Props = $props();
</script>

{#if userReservation}
	<!-- User's Own Reservation - Success Green -->
	<div class="rounded-2xl border-2 border-success bg-success/20 via-success/10 to-success/5 p-4">
		<div class="flex items-center gap-4">
			<div class="rounded-xl bg-success p-3">
				<IconCheckmark class="size-10 text-success-content" />
			</div>

			<div class="flex-1">
				<h3 class="text-2xl font-bold text-success">You've Reserved This Surprise Bag!</h3>
				<a
					href="/reservations/{userReservation.id}"
					class="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-success hover:underline"
				>
					View your reservation details
					<IconArrowRight class="size-4" />
				</a>
			</div>
		</div>
	</div>
{:else if isUser && offer.isActive}
	{#if isReserved}
		<!-- Reserved by Another User - Neutral Gray -->
		<div class="to-base-50 rounded-2xl bg-base-200 p-4">
			<div class="flex items-center gap-4">
				<div class="rounded-xl bg-base-200 p-3">
					<IconLock class="size-10 text-base-content/70" />
				</div>

				<div class="flex-1">
					<h3 class="text-2xl font-bold text-base-content">Currently Reserved</h3>
					<p class="mt-2 text-sm font-medium text-base-content/70">
						This surprise bag is reserved. Check back later!
					</p>
				</div>
			</div>
		</div>
	{:else}
		<!-- Available to Reserve - Vibrant Primary Blue/Purple -->
		<div class="rounded-2xl border-2 border-primary bg-primary/20 via-primary/10 to-primary/5 p-4">
			<div
				class="mb-5 flex items-center gap-3 rounded-xl border-2 border-primary/40 bg-primary/10 p-4 shadow-sm"
			>
				<div class="rounded-lg bg-primary p-2.5">
					<IconClock class="size-6 text-primary-content" />
				</div>
				<div>
					<div class="text-xs font-bold tracking-wider text-primary uppercase">Pickup Time</div>
					<p class="text-lg font-bold text-base-content">
						{formatTime(offer.pickupTimeFrom)} - {formatTime(offer.pickupTimeUntil)}
					</p>
				</div>
			</div>

			<button
				type="button"
				class="btn w-full transition-all btn-lg btn-primary hover:shadow-xl"
				onclick={onReserve}
			>
				<IconShoppingBag class="size-5" />
				Proceed to Payment
				<IconArrowRight class="size-5" />
			</button>
		</div>
	{/if}
{:else if isOwner}
	<!-- Owner Controls - Info Blue or Error Red -->
	{#if isReserved}
		<div class="rounded-2xl border-2 border-info bg-info/20 via-info/10 to-info/5 p-4">
			<div
				class="flex items-center gap-3 rounded-xl border-2 border-info/40 bg-info/10 p-4 shadow-sm"
			>
				<div class="rounded-lg bg-info p-2.5">
					<IconInfo class="size-6 text-info-content" />
				</div>
				<span class="font-bold text-info">Currently reserved by a user</span>
			</div>
		</div>
	{:else}
		<div class="rounded-2xl border-2 border-error/50 bg-error/10 via-error/5 to-base-100 p-4">
			<button
				type="button"
				class="btn w-full transition-all btn-lg btn-error hover:shadow-xl"
				onclick={onDelete}
			>
				<IconDelete class="size-5" />
				Delete Offer
			</button>
		</div>
	{/if}
{:else if !offer.isActive}
	<!-- Inactive Offer - Warning Orange/Yellow -->
	<div class="rounded-2xl border-2 border-warning bg-warning/20 via-warning/10 to-warning/5 p-4">
		<div class="flex items-center gap-4">
			<div class="rounded-xl bg-warning p-3">
				<IconWarning class="size-10 text-warning-content" />
			</div>
			<p class="text-xl font-bold text-warning">This offer is currently inactive</p>
		</div>
	</div>
{/if}
