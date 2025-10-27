<!-- src/routes/(dock)/+layout.svelte -->
<script lang="ts">
	import type { LayoutData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	// User navigation
	import CompassIcon from '~icons/fluent/compass-northwest-24-regular';
	import CompassFilledIcon from '~icons/fluent/compass-northwest-24-filled';
	import FluentShoppingBag24Regular from '~icons/fluent/shopping-bag-24-regular';
	import FluentShoppingBag24Filled from '~icons/fluent/shopping-bag-24-filled';
	import HeartIcon from '~icons/fluent/heart-24-regular';
	import HeartFilledIcon from '~icons/fluent/heart-24-filled';
	import PersonIcon from '~icons/fluent/person-24-regular';
	import PersonFilledIcon from '~icons/fluent/person-24-filled';

	// Business/Charity navigation
	import HomeIcon from '~icons/fluent/home-24-regular';
	import HomeFilledIcon from '~icons/fluent/home-24-filled';
	import ChartIcon from '~icons/fluent/data-bar-vertical-24-regular';
	import ChartFilledIcon from '~icons/fluent/data-bar-vertical-24-filled';
	import TagIcon from '~icons/fluent/tag-24-regular';
	import TagFilledIcon from '~icons/fluent/tag-24-filled';
	import MoneyIcon from '~icons/fluent/money-24-regular';
	import MoneyFilledIcon from '~icons/fluent/money-24-filled';
	import SettingsIcon from '~icons/fluent/settings-24-regular';
	import SettingsFilledIcon from '~icons/fluent/settings-24-filled';

	// Business navigation
	import LocationIcon from '~icons/fluent/location-24-regular';
	import LocationFilledIcon from '~icons/fluent/location-24-filled';

	interface Props {
		children: any;
		data: LayoutData;
	}

	let { children, data }: Props = $props();

	// Navigation configurations for different account types
	const userNav = [
		{
			path: '/discover',
			label: 'Discover',
			icon: CompassIcon,
			filledIcon: CompassFilledIcon
		},
		{
			path: '/reservations',
			label: 'Reservations',
			icon: FluentShoppingBag24Regular,
			filledIcon: FluentShoppingBag24Filled
		},
		{
			path: '/favorites',
			label: 'Favorites',
			icon: HeartIcon,
			filledIcon: HeartFilledIcon
		},
		{
			path: '/profile',
			label: 'Profile',
			icon: PersonIcon,
			filledIcon: PersonFilledIcon
		}
	];

	const businessNav = [
		{
			path: '/dashboard',
			label: 'Dashboard',
			icon: HomeIcon,
			filledIcon: HomeFilledIcon
		},
		{
			path: '/offers',
			label: 'Offers',
			icon: TagIcon,
			filledIcon: TagFilledIcon
		},
		{
			path: '/analytics',
			label: 'Analytics',
			icon: ChartIcon,
			filledIcon: ChartFilledIcon
		},
		{
			path: '/transactions',
			label: 'Payments',
			icon: MoneyIcon,
			filledIcon: MoneyFilledIcon
		},
		{
			path: '/locations',
			label: 'Locations',
			icon: LocationIcon,
			filledIcon: LocationFilledIcon
		},
		{
			path: '/profile',
			label: 'Profile',
			icon: SettingsIcon,
			filledIcon: SettingsFilledIcon
		}
	];

	const charityNav = [
		{
			path: '/dashboard',
			label: 'Dashboard',
			icon: HomeIcon,
			filledIcon: HomeFilledIcon
		},
		{
			path: '/donations',
			label: 'Donations',
			icon: HeartIcon,
			filledIcon: HeartFilledIcon
		},
		{
			path: '/impact',
			label: 'Impact',
			icon: ChartIcon,
			filledIcon: ChartFilledIcon
		},
		{
			path: '/profile',
			label: 'Profile',
			icon: SettingsIcon,
			filledIcon: SettingsFilledIcon
		}
	];

	// Select navigation based on account type
	const navigation = $derived(() => {
		const accountType = data.account?.accountType;

		switch (accountType) {
			case 'business':
				return businessNav;
			case 'charity':
				return charityNav;
			case 'user':
			default:
				return userNav;
		}
	});

	function isActive(path: string) {
		return $page.url.pathname === path;
	}

	function navigateTo(path: string) {
		goto(path);
	}
</script>

<!-- Desktop Sidebar (fixed to left or right based on RTL) -->
<nav
	class="fixed inset-y-0 start-0 z-50 hidden w-56 flex-col gap-2 border-e border-base-300 bg-base-100 p-4 md:flex"
>
	{#each navigation() as item}
		<button
			onclick={() => navigateTo(item.path)}
			class="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-base-200"
			class:bg-primary={isActive(item.path)}
			class:text-primary-content={isActive(item.path)}
		>
			{#if isActive(item.path)}
				<item.filledIcon class="size-6" />
			{:else}
				<item.icon class="size-6" />
			{/if}
			<span class="font-medium">{item.label}</span>
		</button>
	{/each}
</nav>

<!-- Main Content (with padding for sidebar on desktop) -->
<main class="min-h-screen w-full max-w-full overflow-x-hidden p-6 md:ps-56">
	<div class="mb-16 w-full max-w-full md:mb-0">
		{@render children()}
	</div>
</main>

<!-- Mobile Bottom Dock -->
<div class="dock dock-md md:hidden">
	{#each navigation() as item}
		<button
			onclick={() => navigateTo(item.path)}
			class:bg-primary={isActive(item.path)}
			class:text-primary-content={isActive(item.path)}
		>
			{#if isActive(item.path)}
				<item.filledIcon class="size-6" />
			{:else}
				<item.icon class="size-6" />
			{/if}
			<span class="dock-label">{item.label}</span>
		</button>
	{/each}
</div>
