<!-- /src/routes/(dock)/reservations/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-filled';
	import IconFilter from '~icons/fluent/filter-24-regular';

	let { data } = $props();

	let showClaimed = $state(false);

	const filteredReservations = $derived(
		showClaimed ? data.reservations : data.reservations.filter((r) => r.status === 'active')
	);

	function formatDate(date: Date) {
		return new Date(date).toLocaleDateString('en-US', {
			weekday: 'short',
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatTime(date: Date) {
		return new Date(date).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getImageUrl(key: string) {
		return `/api/files/${key}`;
	}

	function getStatusBadge(status: string) {
		const styles = {
			active: 'badge-primary',
			claimed: 'badge-success',
			completed: 'badge-neutral',
			expired: 'badge-error'
		};
		return styles[status as keyof typeof styles] || 'badge-ghost';
	}

	function getStatusText(status: string) {
		const text = {
			active: 'Active',
			claimed: 'Claimed',
			completed: 'Completed',
			expired: 'Expired'
		};
		return text[status as keyof typeof text] || status;
	}
</script>

<div class="min-h-screen bg-base-100">
	<div class="container mx-auto max-w-5xl px-4 py-8">
		<!-- Header -->
		<div class="mb-8 flex items-center justify-between">
			<h1 class="text-3xl font-bold">My Reservations</h1>

			<!-- Filter Toggle -->
			<div class="flex items-center gap-3">
				<IconFilter class="h-5 w-5 text-base-content/60" />
				<label class="flex cursor-pointer items-center gap-2">
					<input type="checkbox" class="toggle toggle-primary" bind:checked={showClaimed} />
					<span class="text-sm font-medium">Show claimed</span>
				</label>
			</div>
		</div>

		<!-- Empty State -->
		{#if filteredReservations.length === 0}
			<div class="card bg-base-200/50">
				<div class="card-body items-center py-16 text-center">
					<IconCalendar class="mb-4 h-20 w-20 text-base-content/30" />
					<h2 class="mb-2 text-xl font-semibold">
						{showClaimed ? 'No reservations found' : 'No active reservations'}
					</h2>
					<p class="text-base-content/60">
						{showClaimed
							? "You haven't made any reservations yet."
							: 'You have no active offers reserved. Browse offers to get started.'}
					</p>
				</div>
			</div>
		{:else}
			<!-- Reservations Grid -->
			<div class="grid gap-4">
				{#each filteredReservations as reservation}
					<a
						href="/reservations/{reservation.id}"
						class="card bg-base-100 transition-all duration-200 hover:bg-base-200/50"
					>
						<div class="card-body p-6">
							<div class="flex flex-col gap-4">
								<!-- Status Badge (for claimed/completed) -->
								{#if reservation.status !== 'active'}
									<div class="flex justify-end">
										<span class="badge {getStatusBadge(reservation.status)} gap-2 badge-lg">
											{#if reservation.status === 'claimed'}
												<IconCheckmark class="h-4 w-4" />
											{/if}
											{getStatusText(reservation.status)}
										</span>
									</div>
								{/if}

								<!-- Pickup Date & Time -->
								<div class="flex items-start gap-4">
									<div class="rounded-xl bg-primary/10 p-3">
										<IconCalendar class="h-6 w-6 text-primary" />
									</div>
									<div class="flex-1">
										<div
											class="mb-1 text-xs font-medium tracking-wide text-base-content/50 uppercase"
										>
											Pickup Time
										</div>
										<div class="text-lg font-semibold">
											{formatDate(reservation.pickupFrom)}
										</div>
										<div class="mt-1 flex items-center gap-2 text-sm text-base-content/70">
											<IconClock class="h-4 w-4" />
											<span>
												{formatTime(reservation.pickupFrom)} - {formatTime(reservation.pickupUntil)}
											</span>
										</div>
									</div>
								</div>

								<!-- Offer Details -->
								<div class="space-y-2">
									<h3 class="text-xl font-bold">{reservation.offer.name}</h3>
									<p class="line-clamp-2 text-sm text-base-content/60">
										{reservation.offer.description}
									</p>
									<div class="text-lg font-semibold text-primary">
										{reservation.offer.price.toFixed(2)}
										{reservation.offer.currency}
									</div>
								</div>

								<!-- Location -->
								{#if reservation.location}
									<div class="flex items-start gap-3 rounded-lg bg-base-200/50 p-3">
										<IconLocation class="mt-0.5 h-5 w-5 shrink-0 text-base-content/60" />
										<div class="text-sm">
											<div class="font-medium">{reservation.location.name}</div>
											<div class="text-base-content/50">
												{reservation.location.address}, {reservation.location.zipCode}
												{reservation.location.city}
											</div>
										</div>
									</div>
								{/if}

								<!-- Business Info & Arrow -->
								<div
									class="mt-2 flex items-center justify-between border-t border-base-content/10 pt-4"
								>
									<div class="flex items-center gap-3">
										<div class="avatar">
											<div class="h-10 w-10 rounded-full ring-2 ring-base-content/10">
												<img
													src={getImageUrl(reservation.profilePicture.key)}
													alt={reservation.business.name}
												/>
											</div>
										</div>
										<div class="text-sm font-medium">{reservation.business.name}</div>
									</div>
									<IconArrowRight class="h-5 w-5 text-base-content/40" />
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
