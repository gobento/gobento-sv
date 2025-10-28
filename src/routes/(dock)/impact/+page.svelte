<!-- src/routes/(authorized)/impact/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import IconLeaf from '~icons/fluent/leaf-three-24-regular';
	import IconMoney from '~icons/fluent/money-24-regular';
	import IconWeatherMoon from '~icons/fluent/weather-moon-24-regular';
	import IconDrop from '~icons/fluent/drop-24-regular';
	import IconTrophy from '~icons/fluent/trophy-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconFood from '~icons/fluent/food-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconPeople from '~icons/fluent/people-24-regular';
	import IconSparkle from '~icons/fluent/sparkle-24-regular';

	let { data }: { data: PageData } = $props();

	const impactCards = $derived([
		{
			icon: IconMoney,
			title: 'Money Saved',
			value: `${data.stats.currency === 'EUR' ? '€' : data.stats.currency}${data.stats.moneySaved.toFixed(2)}`,
			subtitle: 'From discounted offers',
			color: 'text-success',
			bgColor: 'bg-success/10'
		},
		{
			icon: IconLeaf,
			title: 'CO₂ Prevented',
			value: `${data.stats.co2Saved} kg`,
			subtitle: `Equivalent to ${Math.round(data.stats.co2Saved * 4)} km driving`,
			color: 'text-accent',
			bgColor: 'bg-accent/10'
		},
		{
			icon: IconWeatherMoon,
			title: 'Energy Saved',
			value: `${data.stats.energySaved} kWh`,
			subtitle: `Powers a home for ${Math.round(data.stats.energySaved / 30)} days`,
			color: 'text-warning',
			bgColor: 'bg-warning/10'
		},
		{
			icon: IconFood,
			title: 'Meals Rescued',
			value: data.stats.totalReservations.toString(),
			subtitle: 'From going to waste',
			color: 'text-primary',
			bgColor: 'bg-primary/10'
		}
	]);

	const additionalMetrics = $derived([
		{
			icon: IconDrop,
			label: 'Water Conserved',
			value: `${data.stats.waterSaved}L`,
			description: 'Water footprint of saved food'
		},
		{
			icon: IconCalendar,
			label: 'Active Months',
			value: data.stats.monthsActive.toString(),
			description: 'Making a difference'
		},
		{
			icon: IconTrophy,
			label: 'Favorite Type',
			value: data.stats.favoriteCategory,
			description: 'Most rescued category'
		}
	]);

	const achievements = $derived([
		{
			name: 'First Rescue',
			emoji: '🌱',
			unlocked: data.stats.totalReservations >= 1
		},
		{
			name: '10 Meals',
			emoji: '⭐',
			unlocked: data.stats.totalReservations >= 10
		},
		{
			name: '50kg CO₂',
			emoji: '🌍',
			unlocked: data.stats.co2Saved >= 50
		},
		{
			name: 'Eco Warrior',
			emoji: '🏆',
			unlocked: data.stats.totalReservations >= 50
		}
	]);
</script>

<!-- Header -->
<div class="space-y-3 text-center">
	<div
		class="mb-2 inline-flex size-16 items-center justify-center rounded-full bg-linear-to-br from-success to-accent"
	>
		<IconLeaf class="size-8 text-white" />
	</div>
	<h1 class="text-3xl font-bold">Your Impact Story</h1>
	<p class="text-lg opacity-70">Every Food rescue makes a difference. One Bento at a time.</p>
</div>

<!-- Main Impact Cards -->
<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
	{#each impactCards as card}
		<div class="card bg-base-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
			<div class="card-body">
				<div class="inline-flex rounded-xl p-3 {card.bgColor} w-fit">
					<card.icon class="size-6 {card.color}" />
				</div>
				<h3 class="text-sm font-medium opacity-70">{card.title}</h3>
				<p class="text-lg font-bold">{card.value}</p>
				<p class="text-xs opacity-60">{card.subtitle}</p>
			</div>
		</div>
	{/each}
</div>

<!-- Secondary Metrics -->
<div class="card bg-base-100">
	<div class="card-body">
		<h2 class="card-title flex items-center gap-2 text-2xl">
			<IconSparkle class="size-6 text-accent" />
			Additional Impact
		</h2>
		<div class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
			{#each additionalMetrics as metric}
				<div class="flex items-start gap-4">
					<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
						<metric.icon class="size-6 text-accent" />
					</div>
					<div>
						<p class="text-sm font-medium opacity-70">{metric.label}</p>
						<p class="text-2xl font-bold">{metric.value}</p>
						<p class="mt-1 text-xs opacity-60">{metric.description}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Community Impact -->
<div class="card bg-linear-to-br from-success to-accent text-white">
	<div class="card-body">
		<div class="mb-2 flex items-center gap-3">
			<IconPeople class="size-8" />
			<h2 class="card-title text-2xl">Community Impact</h2>
		</div>
		<p class="mb-4 opacity-90">
			Together with our community, you've helped prevent food waste and reduce environmental impact.
			Your {data.stats.totalReservations} rescued meals are part of a larger movement.
		</p>
		<div class="grid grid-cols-2 gap-4">
			<div class="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
				<p class="mb-1 text-sm text-white/70">Your Rank</p>
				<p class="text-lg font-bold">Top {data.stats.rankPercentile}%</p>
				<p class="mt-1 text-xs text-white/70">Of all rescuers</p>
			</div>
			<div class="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
				<p class="mb-1 text-sm text-white/70">Total Reservations</p>
				<p class="text-lg font-bold">{data.stats.totalReservations}</p>
				<p class="mt-1 text-xs text-white/70">And counting!</p>
			</div>
		</div>
	</div>
</div>

<!-- Achievement Badges -->
<div class="card bg-base-100">
	<div class="card-body">
		<h2 class="card-title flex items-center gap-2 text-2xl">
			<IconTrophy class="size-6 text-warning" />
			Achievements Unlocked
		</h2>
		<div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
			{#each achievements as badge}
				<div
					class="rounded-xl p-4 text-center transition-all {badge.unlocked
						? 'border-2 border-warning bg-warning/10'
						: 'border-2 border-base-300 bg-base-200 opacity-50'}"
				>
					<div class="mb-2 text-3xl">{badge.emoji}</div>
					<p class="text-sm font-medium">{badge.name}</p>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Recent Activity -->
{#if data.recentActivity.length > 0}
	<div class="card bg-base-100">
		<div class="card-body">
			<h2 class="card-title flex items-center gap-2 text-2xl">
				<IconHeart class="size-6 text-error" />
				Recent Rescues
			</h2>
			<div class="mt-4 space-y-3">
				{#each data.recentActivity as activity}
					<div class="flex items-center justify-between rounded-lg bg-base-200 p-3">
						<div class="flex items-center gap-3">
							<IconFood class="size-5 text-primary" />
							<div>
								<p class="font-medium">{activity.name}</p>
								<p class="text-xs opacity-60">
									{new Date(activity.claimedAt).toLocaleDateString()}
								</p>
							</div>
						</div>
						<div class="badge badge-lg badge-success">
							Saved {data.stats.currency === 'EUR' ? '€' : ''}{activity.saved}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<!-- Call to Action -->
<div class="py-8 text-center">
	<p class="mb-4 opacity-70">Keep up the amazing work!</p>
	<a href="/offers" class="btn btn-primary">
		<IconFood class="size-5" />
		Find More Offers
	</a>
</div>
