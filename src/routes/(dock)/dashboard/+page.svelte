<!-- src/routes/(dock)/dashboard/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import BaseLayout from '#lib/components/BaseLayout.svelte';
	import StatTile from '#lib/components/ui/StatTile.svelte';
	import SectionCard from '#lib/components/ui/SectionCard.svelte';
	import { formatPickupWindow } from '#lib/components/reservations/pickup.js';
	import IconHome from '~icons/fluent/home-24-regular';
	import IconBag from '~icons/fluent/shopping-bag-24-regular';
	import IconMoney from '~icons/fluent/money-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconChart from '~icons/fluent/data-trending-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconArrow from '~icons/fluent/arrow-right-24-regular';

	let { data }: { data: PageData } = $props();

	const euro = (value: number) =>
		value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
</script>

<BaseLayout title="Dashboard" description="Today at a glance, your offers and your giving" icon={IconHome}>
	<div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
		<StatTile
			label="To hand over"
			value={data.pickupsNextDay}
			icon={IconBag}
			tone="primary"
			hint="next 24 hours"
			href="/offers"
		/>
		<StatTile
			label="Reservations"
			value={data.stats.totalReservations}
			icon={IconChart}
			tone="info"
			hint="{data.stats.avgPerDay} per day · 30 days"
			href="/analytics"
		/>
		<StatTile
			label="Revenue"
			value={data.stats.totalRevenue}
			decimals={2}
			prefix="€"
			icon={IconMoney}
			tone="success"
			hint="last 30 days"
			href="/transactions"
		/>
		<StatTile
			label="Active offers"
			value={data.stats.activeOffers}
			icon={IconTag}
			tone="accent"
			hint="{data.stats.completionRate}% picked up"
			href="/offers"
		/>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<SectionCard
			title="Giving"
			description="Food that goes to charities instead of the bin"
			icon={IconHeart}
			tone="secondary"
			bodyClass="gap-4"
		>
			{#snippet actions()}
				<a href="/charities" class="btn gap-1 btn-ghost btn-sm">Charities <IconArrow class="size-4" /></a>
			{/snippet}

			<div class="grid grid-cols-3 gap-2 text-center">
				<div class="rounded-xl bg-base-200/60 p-3">
					<p class="text-2xl font-extrabold">{data.giving.donations}</p>
					<p class="text-xs text-base-content/60">pickups given</p>
				</div>
				<div class="rounded-xl bg-base-200/60 p-3">
					<p class="text-2xl font-extrabold">{data.giving.charities}</p>
					<p class="text-xs text-base-content/60">charities helped</p>
				</div>
				<div class="rounded-xl bg-base-200/60 p-3">
					<p class="text-2xl font-extrabold">{data.giving.activeGifts}</p>
					<p class="text-xs text-base-content/60">regular gifts</p>
				</div>
			</div>

			{#if data.giving.proposedGifts > 0}
				<p class="text-sm text-base-content/70">
					{data.giving.proposedGifts} regular {data.giving.proposedGifts === 1 ? 'gift is' : 'gifts are'} waiting
					for the charity to accept.
				</p>
			{/if}

			{#if data.giving.upcoming.length > 0}
				<div>
					<p class="mb-2 text-sm font-semibold">Charity pickups this week</p>
					<ul class="space-y-2">
						{#each data.giving.upcoming as pickup (pickup.id)}
							<li class="flex items-center gap-3 rounded-xl border border-base-300 p-3 text-sm">
								{#if pickup.recurring}
									<IconRepeat class="size-4 shrink-0 text-primary" />
								{:else}
									<IconHeart class="size-4 shrink-0 text-secondary" />
								{/if}
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium">{pickup.charityName}</p>
									<p class="truncate text-xs text-base-content/60">
										{pickup.from && pickup.until ? formatPickupWindow(pickup.from, pickup.until) : 'Time to be agreed'}{pickup.locationName
											? ` · ${pickup.locationName}`
											: ''}
									</p>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{:else if data.giving.activeGifts === 0}
				<div class="rounded-xl border border-dashed border-base-300 p-4 text-sm text-base-content/70">
					Have surplus food most days? Set up a <strong>regular gift</strong> and a local charity
					collects it on a fixed schedule — no need to ask each time.
					<a href="/charities" class="link mt-2 block font-semibold link-primary">Find a charity</a>
				</div>
			{:else}
				<p class="text-sm text-base-content/60">No charity pickups in the next 7 days.</p>
			{/if}
		</SectionCard>

		<SectionCard title="Top offers" description="Most reserved, last 30 days" icon={IconTag} bodyClass="gap-3">
			{#snippet actions()}
				<a href="/offers" class="btn gap-1 btn-ghost btn-sm">Offers <IconArrow class="size-4" /></a>
			{/snippet}
			{#if data.offerPerformanceData.length === 0}
				<p class="text-sm text-base-content/60">No active offers yet.</p>
			{:else}
				<ul class="divide-y divide-base-200">
					{#each data.offerPerformanceData as offer (offer.id)}
						<li class="flex items-center justify-between gap-3 py-2 text-sm">
							<a href="/offers/{offer.id}" class="truncate font-medium hover:underline">{offer.name}</a>
							<span class="shrink-0 text-base-content/60 tabular-nums">
								{offer.reservations} · €{euro(offer.revenue)}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</SectionCard>

		<SectionCard title="Locations" icon={IconLocation} bodyClass="gap-3" class="lg:col-span-2">
			{#snippet actions()}
				<a href="/locations" class="btn gap-1 btn-ghost btn-sm">All <IconArrow class="size-4" /></a>
			{/snippet}
			{#if data.locationPerformanceData.length === 0}
				<p class="text-sm text-base-content/60">Add your first location to start selling.</p>
			{:else}
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{#each data.locationPerformanceData as loc (loc.id)}
						<a href="/locations/{loc.id}" class="rounded-xl border border-base-300 p-3 text-sm hover:bg-base-200/50">
							<p class="truncate font-semibold">{loc.name}</p>
							<p class="truncate text-xs text-base-content/60">{loc.address}, {loc.city}</p>
							<p class="mt-2 text-xs text-base-content/70">
								{loc.totalReservations} reservations · {loc.completionRate}% picked up · {loc.favoritesCount} ♥
							</p>
						</a>
					{/each}
				</div>
			{/if}
		</SectionCard>
	</div>
</BaseLayout>
