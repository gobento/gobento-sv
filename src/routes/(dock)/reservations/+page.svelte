<script lang="ts">
	import { page } from '$app/stores';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';

	let { data } = $props();

	function formatDate(date: Date) {
		return new Date(date).toLocaleDateString('de-DE', {
			weekday: 'short',
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatTime(date: Date) {
		return new Date(date).toLocaleTimeString('de-DE', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getImageUrl(key: string) {
		return `/api/files/${key}`;
	}
</script>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<h1 class="mb-8 text-3xl font-bold">Meine Reservierungen</h1>

	{#if data.reservations.length === 0}
		<div class="card bg-base-200">
			<div class="card-body py-12 text-center">
				<IconCalendar class="mx-auto mb-4 h-16 w-16 opacity-50" />
				<h2 class="mb-2 text-xl font-semibold">Keine aktiven Reservierungen</h2>
				<p class="text-base-content/70">Du hast noch keine Angebote reserviert.</p>
			</div>
		</div>
	{:else}
		<div class="grid gap-4 md:gap-6">
			{#each data.reservations as reservation}
				<a
					href="/reservations/{reservation.id}"
					class="card bg-base-100 shadow-lg transition-all duration-200 hover:scale-[1.01] hover:shadow-xl"
				>
					<div class="card-body">
						<div class="flex flex-col gap-4">
							<!-- Pickup Date & Time -->
							<div class="flex items-start gap-3">
								<div class="rounded-lg bg-primary/10 p-3">
									<IconCalendar class="h-6 w-6 text-primary" />
								</div>
								<div class="flex-1">
									<div class="mb-1 text-sm font-medium text-base-content/70">Abholzeit</div>
									<div class="text-lg font-semibold">
										{formatDate(reservation.pickupFrom)}
									</div>
									<div class="mt-1 flex items-center gap-2 text-base-content/80">
										<IconClock class="h-4 w-4" />
										<span>
											{formatTime(reservation.pickupFrom)} - {formatTime(reservation.pickupUntil)}
										</span>
									</div>
								</div>
							</div>

							<!-- Offer Details -->
							<div class="divider my-0"></div>

							<div>
								<h3 class="mb-2 text-xl font-bold">{reservation.offer.name}</h3>
								<p class="line-clamp-2 text-base-content/70">{reservation.offer.description}</p>
							</div>

							<!-- Location -->
							{#if reservation.location}
								<div class="flex items-start gap-2 text-base-content/80">
									<IconLocation class="mt-0.5 h-5 w-5 shrink-0" />
									<div class="text-sm">
										<div class="font-medium">{reservation.location.name}</div>
										<div class="text-base-content/60">
											{reservation.location.address}, {reservation.location.zipCode}
											{reservation.location.city}
										</div>
									</div>
								</div>
							{/if}

							<!-- Business Info & Arrow -->
							<div class="mt-2 flex items-center justify-between border-t border-base-300 pt-4">
								<div class="flex items-center gap-3">
									<div class="avatar">
										<div class="h-10 w-10 rounded-full">
											<img
												src={getImageUrl(reservation.profilePicture.key)}
												alt={reservation.business.name}
											/>
										</div>
									</div>
									<div class="text-sm font-medium">{reservation.business.name}</div>
								</div>
								<IconArrowRight class="h-5 w-5 text-base-content/50" />
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
