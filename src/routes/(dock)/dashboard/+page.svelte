<!-- src/routes/(dock)/dashboard/+page.svelte -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { withSearch } from '#lib/paths.js';
	import type { PageData } from './$types';
	import BaseLayout from '#lib/components/layout/BaseLayout.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import StatTile from '#lib/components/ui/StatTile.svelte';
	import SectionCard from '#lib/components/ui/SectionCard.svelte';
	import { formatPickupWindow } from '#lib/components/reservations/pickup.js';
	import IconHome from '~icons/fluent/home-24-regular';
	import IconBag from '~icons/fluent/shopping-bag-24-regular';
	import IconMoney from '~icons/fluent/money-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconRepeat from '~icons/fluent/arrow-repeat-all-24-regular';
	import IconChart from '~icons/fluent/data-trending-24-regular';
	import IconWarning from '~icons/fluent/warning-24-regular';
	import IconArrow from '~icons/fluent/arrow-right-24-regular';

	let { data }: { data: PageData } = $props();

	const attention = $derived(
		[
			data.attention.openComplaints > 0 && {
				label: `${data.attention.openComplaints} open ${data.attention.openComplaints === 1 ? 'complaint' : 'complaints'}`,
				hint: 'Reply to customers',
				href: resolve('/(dock)/complaints'),
				icon: IconWarning
			},
			data.attention.expiredOffers > 0 && {
				label: `${data.attention.expiredOffers} ${data.attention.expiredOffers === 1 ? 'offer has' : 'offers have'} expired`,
				hint: 'Still listed as active',
				href: resolve('/(dock)/offers'),
				icon: IconTag
			},
			data.attention.inactiveOffers > 0 && {
				label: `${data.attention.inactiveOffers} inactive ${data.attention.inactiveOffers === 1 ? 'offer' : 'offers'}`,
				hint: 'Paused or not published',
				href: withSearch(resolve('/(dock)/offers'), { status: 'inactive' }),
				icon: IconTag
			}
		].filter((item): item is NonNullable<typeof item> => Boolean(item))
	);

	const euro = (value: number) =>
		value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
</script>

<BaseLayout
	title="Dashboard"
	description="What needs doing today, and how your business is doing"
	icon={IconHome}
>
	{#snippet actions()}
		<Button
			href={resolve('/(dock)/offers/new')}
			icon={IconAdd}
			size="sm"
			class="hidden sm:inline-flex">New offer</Button
		>
	{/snippet}

	<div class="mb-6 flex flex-wrap gap-2">
		<Button href={resolve('/(dock)/offers/new')} icon={IconAdd} size="sm" class="sm:hidden">
			New offer
		</Button>
		<Button href={resolve('/(dock)/locations/new')} icon={IconLocation} variant="outline" size="sm">
			Add location
		</Button>
		<Button href={resolve('/(dock)/charities')} icon={IconHeart} variant="outline" size="sm">
			Find a charity
		</Button>
	</div>

	<div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
		<StatTile
			label="To hand over"
			value={data.pickupsNextDay}
			icon={IconBag}
			tone="primary"
			hint="next 24 hours"
			href="#pickups"
		/>
		<StatTile
			label="Reservations"
			value={data.stats.totalReservations}
			icon={IconChart}
			tone="info"
			hint="{data.stats.avgPerDay.toFixed(1)} per day · last 30 days"
			href={resolve('/(dock)/analytics')}
		/>
		<StatTile
			label="Revenue"
			value={data.stats.totalRevenue}
			decimals={2}
			prefix="€"
			icon={IconMoney}
			tone="success"
			hint="last 30 days"
			href={resolve('/(dock)/transactions')}
		/>
		<StatTile
			label="Active offers"
			value={data.stats.activeOffers}
			icon={IconTag}
			tone="accent"
			hint="{data.stats.completionRate}% picked up"
			href={resolve('/(dock)/offers')}
		/>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<div id="pickups" class="scroll-mt-4">
			<SectionCard
				title="Next 24 hours"
				description="Bags your customers and charities will collect"
				icon={IconBag}
				bodyClass="gap-3"
			>
				{#snippet actions()}
					<span class="badge badge-sm badge-primary">{data.pickupsNextDay} total</span>
				{/snippet}

				{#if data.upcomingPickups.length === 0}
					<p
						class="rounded-xl border border-dashed border-base-300 p-4 text-sm text-base-content/60"
					>
						No pickups due. Enjoy the quiet — the next orders will show up here automatically.
					</p>
				{:else}
					<ul class="space-y-2">
						{#each data.upcomingPickups as pickup (pickup.id)}
							<li>
								<a
									href={resolve('/(dock)/offers/[id]', { id: pickup.offerId })}
									class="pressable flex items-center gap-3 rounded-xl border border-base-300 p-3 hover:border-primary/30"
								>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-semibold">{pickup.offerName}</p>
										<p class="truncate text-xs text-base-content/60">
											{formatPickupWindow(pickup.from, pickup.until)}{pickup.locationName
												? ` · ${pickup.locationName}`
												: ''}
										</p>
									</div>
									<IconArrow class="size-4 shrink-0 text-base-content/40 rtl:rotate-180" />
								</a>
							</li>
						{/each}
					</ul>
					{#if data.pickupsNextDay > data.upcomingPickups.length}
						<p class="text-xs text-base-content/50">
							+ {data.pickupsNextDay - data.upcomingPickups.length} more in the next 24 hours
						</p>
					{/if}
				{/if}
			</SectionCard>
		</div>

		<SectionCard
			title="Giving"
			description="Food that goes to charities instead of the bin"
			icon={IconHeart}
			tone="secondary"
			bodyClass="gap-4"
		>
			{#snippet actions()}
				<a href={resolve('/(dock)/charities')} class="btn gap-1 btn-ghost btn-sm"
					>Charities <IconArrow class="size-4" /></a
				>
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
					{data.giving.proposedGifts} regular {data.giving.proposedGifts === 1
						? 'gift is'
						: 'gifts are'} waiting for the charity to accept.
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
										{pickup.from && pickup.until
											? formatPickupWindow(pickup.from, pickup.until)
											: 'Time to be agreed'}{pickup.locationName ? ` · ${pickup.locationName}` : ''}
									</p>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{:else if data.giving.activeGifts === 0}
				<div
					class="rounded-xl border border-dashed border-base-300 p-4 text-sm text-base-content/70"
				>
					Have surplus food most days? Set up a <strong>regular gift</strong> and a local charity
					collects it on a fixed schedule — no need to ask each time.
					<a href={resolve('/(dock)/charities')} class="mt-2 block link font-semibold link-primary"
						>Find a charity</a
					>
				</div>
			{:else}
				<p class="text-sm text-base-content/60">No charity pickups in the next 7 days.</p>
			{/if}
		</SectionCard>

		{#if attention.length > 0}
			<SectionCard
				title="Needs attention"
				description="Small things worth a look"
				icon={IconWarning}
				tone="warning"
				bodyClass="gap-2"
				class="lg:col-span-2"
			>
				{#each attention as item (item.label)}
					<a
						href={item.href}
						class="pressable flex items-center gap-3 rounded-xl border border-base-300 p-3 hover:border-warning/40"
					>
						<item.icon class="size-5 shrink-0 text-warning" />
						<span class="min-w-0 flex-1 truncate text-sm font-semibold">{item.label}</span>
						<span class="hidden text-xs text-base-content/60 sm:block">{item.hint}</span>
						<IconArrow class="size-4 shrink-0 text-base-content/40 rtl:rotate-180" />
					</a>
				{/each}
			</SectionCard>
		{/if}

		<SectionCard
			title="Top offers"
			description="Most reserved, last 30 days"
			icon={IconTag}
			bodyClass="gap-3"
		>
			{#snippet actions()}
				<a href={resolve('/(dock)/offers')} class="btn gap-1 btn-ghost btn-sm"
					>Offers <IconArrow class="size-4" /></a
				>
			{/snippet}
			{#if data.offerPerformanceData.length === 0}
				<p class="text-sm text-base-content/60">No active offers yet.</p>
			{:else}
				<ul class="divide-y divide-base-200">
					{#each data.offerPerformanceData as offer (offer.id)}
						<li class="flex items-center justify-between gap-3 py-2 text-sm">
							<a
								href={resolve('/(dock)/offers/[id]', { id: offer.id })}
								class="truncate font-medium hover:underline">{offer.name}</a
							>
							<span class="shrink-0 text-base-content/60 tabular-nums">
								{offer.reservations} · €{euro(offer.revenue)}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</SectionCard>

		<SectionCard title="Locations" icon={IconLocation} bodyClass="gap-3">
			{#snippet actions()}
				<a href={resolve('/(dock)/locations')} class="btn gap-1 btn-ghost btn-sm"
					>All <IconArrow class="size-4" /></a
				>
			{/snippet}
			{#if data.locationPerformanceData.length === 0}
				<p class="text-sm text-base-content/60">Add your first location to start selling.</p>
			{:else}
				<ul class="space-y-2">
					{#each data.locationPerformanceData as loc (loc.id)}
						<li>
							<a
								href={resolve('/(dock)/locations/[id]', { id: loc.id })}
								class="pressable flex items-center gap-3 rounded-xl border border-base-300 p-3 hover:border-primary/30"
							>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-semibold">{loc.name}</p>
									<p class="truncate text-xs text-base-content/60">
										{loc.address}, {loc.city}
									</p>
								</div>
								<span class="shrink-0 text-right text-xs text-base-content/60">
									<span class="block font-semibold text-base-content tabular-nums"
										>{loc.totalReservations}</span
									>
									{loc.completionRate}% picked up
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</SectionCard>
	</div>
</BaseLayout>
