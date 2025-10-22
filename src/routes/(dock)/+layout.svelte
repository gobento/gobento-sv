<!-- src/routes/(dock)/+layout.svelte -->
<script lang="ts">
	import type { LayoutData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	// User navigation
	import CompassIcon from '~icons/fluent/compass-northwest-24-regular';
	import CompassFilledIcon from '~icons/fluent/compass-northwest-24-filled';
	import SearchIcon from '~icons/fluent/search-24-regular';
	import SearchFilledIcon from '~icons/fluent/search-24-filled';
	import HeartIcon from '~icons/fluent/heart-24-regular';
	import HeartFilledIcon from '~icons/fluent/heart-24-filled';
	import PersonIcon from '~icons/fluent/person-24-regular';
	import PersonFilledIcon from '~icons/fluent/person-24-filled';

	// Business/Charity navigation
	import HomeIcon from '~icons/fluent/home-24-regular';
	import HomeFilledIcon from '~icons/fluent/home-24-filled';
	import ChartIcon from '~icons/fluent/data-bar-vertical-24-regular';
	import ChartFilledIcon from '~icons/fluent/data-bar-vertical-24-filled';
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
			path: '/',
			label: 'Discover',
			icon: CompassIcon,
			filledIcon: CompassFilledIcon
		},
		{
			path: '/search',
			label: 'Search',
			icon: SearchIcon,
			filledIcon: SearchFilledIcon
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
			path: '/settings',
			label: 'Settings',
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
			path: '/settings',
			label: 'Settings',
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

<div class="flex w-full flex-col sm:w-3xl">
	{@render children()}
</div>

<div class="dock dock-md">
	{#each navigation() as item}
		<button onclick={() => navigateTo(item.path)} class:dock-active={isActive(item.path)}>
			{#if isActive(item.path)}
				<item.filledIcon class="size-6" />
			{:else}
				<item.icon class="size-6" />
			{/if}
			<span class="dock-label">{item.label}</span>
		</button>
	{/each}
</div>
