<!-- src/routes/(dock)/+layout.svelte -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Component, Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { page, navigating } from '$app/state';
	import Modal from '#lib/components/Modal.svelte';
	import {
		activePath,
		navigationFor,
		splitForTabBar,
		type NavIcon,
		type NavItem
	} from '#lib/navigation.js';

	import BentoIcon from '~icons/fluent-emoji-flat/bento-box';
	import CompassIcon from '~icons/fluent/compass-northwest-24-regular';
	import CompassFilledIcon from '~icons/fluent/compass-northwest-24-filled';
	import BagIcon from '~icons/fluent/shopping-bag-24-regular';
	import BagFilledIcon from '~icons/fluent/shopping-bag-24-filled';
	import HeartIcon from '~icons/fluent/heart-24-regular';
	import HeartFilledIcon from '~icons/fluent/heart-24-filled';
	import PersonIcon from '~icons/fluent/person-24-regular';
	import PersonFilledIcon from '~icons/fluent/person-24-filled';
	import HomeIcon from '~icons/fluent/home-24-regular';
	import HomeFilledIcon from '~icons/fluent/home-24-filled';
	import ChartIcon from '~icons/fluent/data-bar-vertical-24-regular';
	import ChartFilledIcon from '~icons/fluent/data-bar-vertical-24-filled';
	import TagIcon from '~icons/fluent/tag-24-regular';
	import TagFilledIcon from '~icons/fluent/tag-24-filled';
	import MoneyIcon from '~icons/fluent/money-24-regular';
	import MoneyFilledIcon from '~icons/fluent/money-24-filled';
	import LocationIcon from '~icons/fluent/location-24-regular';
	import LocationFilledIcon from '~icons/fluent/location-24-filled';
	import WarningIcon from '~icons/fluent/warning-24-regular';
	import WarningFilledIcon from '~icons/fluent/warning-24-filled';
	import SettingsIcon from '~icons/fluent/settings-24-regular';
	import SettingsFilledIcon from '~icons/fluent/settings-24-filled';
	import ShieldIcon from '~icons/fluent/shield-task-24-regular';
	import ShieldFilledIcon from '~icons/fluent/shield-task-24-filled';
	import MoreIcon from '~icons/fluent/grid-dots-24-regular';
	import MoreFilledIcon from '~icons/fluent/grid-dots-24-filled';
	import ChevronIcon from '~icons/fluent/chevron-right-24-regular';
	import SignOutIcon from '~icons/fluent/sign-out-24-regular';

	interface Props {
		children: Snippet;
		data: LayoutData;
	}

	let { children, data }: Props = $props();

	const ICONS: Record<NavIcon, { regular: Component; filled: Component }> = {
		discover: { regular: CompassIcon, filled: CompassFilledIcon },
		bag: { regular: BagIcon, filled: BagFilledIcon },
		heart: { regular: HeartIcon, filled: HeartFilledIcon },
		person: { regular: PersonIcon, filled: PersonFilledIcon },
		home: { regular: HomeIcon, filled: HomeFilledIcon },
		tag: { regular: TagIcon, filled: TagFilledIcon },
		chart: { regular: ChartIcon, filled: ChartFilledIcon },
		money: { regular: MoneyIcon, filled: MoneyFilledIcon },
		location: { regular: LocationIcon, filled: LocationFilledIcon },
		warning: { regular: WarningIcon, filled: WarningFilledIcon },
		settings: { regular: SettingsIcon, filled: SettingsFilledIcon },
		shield: { regular: ShieldIcon, filled: ShieldFilledIcon }
	};

	const items = $derived(navigationFor(data.account?.accountType));
	const active = $derived(activePath(items, page.url.pathname));
	const bar = $derived(splitForTabBar(items));
	const overflowActive = $derived(bar.overflow.some((item) => item.path === active));

	let moreOpen = $state(false);

	// Close the sheet as soon as a navigation starts.
	$effect(() => {
		if (navigating.to) moreOpen = false;
	});
</script>

{#snippet glyph(item: NavItem, isActive: boolean)}
	{@const Icon = isActive ? ICONS[item.icon].filled : ICONS[item.icon].regular}
	{#key isActive}
		<Icon class="size-6 {isActive ? 'animate-pop-in' : ''}" />
	{/key}
{/snippet}

<!-- Slim progress bar while a client-side navigation loads. The current page
     stays interactive underneath, so navigation never blocks. -->
{#if navigating.to}
	<div class="nav-progress" aria-hidden="true"><span></span></div>
{/if}

<a
	href="#main"
	class="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[2000] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-primary-content"
>
	Skip to content
</a>

<!-- Desktop sidebar -->
<nav
	aria-label="Main"
	class="fixed inset-y-0 start-0 z-50 hidden w-60 flex-col border-e border-base-300/70 bg-base-100 p-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:flex"
>
	<a href={resolve('/(dock)')} class="mb-4 flex items-center gap-2.5 rounded-2xl px-3 py-3">
		<BentoIcon class="size-8" />
		<span class="text-xl font-extrabold tracking-tight">GoBento</span>
	</a>

	<div class="flex flex-1 flex-col gap-1 overflow-y-auto">
		{#each items as item, index (item.path)}
			{@const isActive = item.path === active}
			{#if item.section && items[index - 1]?.section !== item.section}
				<p
					class="px-3.5 pt-3 pb-1 text-xs font-semibold tracking-wide text-base-content/40 uppercase"
				>
					{item.section}
				</p>
			{/if}
			<!-- eslint-disable svelte/no-navigation-without-resolve -- fixed app paths from navigation.ts -->
			<a
				href={item.path}
				aria-current={isActive ? 'page' : undefined}
				class="nav-item"
				class:nav-item-active={isActive}
				><!-- eslint-enable svelte/no-navigation-without-resolve -->
				{@render glyph(item, isActive)}
				<span>{item.label}</span>
			</a>
		{/each}
	</div>

	<div class="mt-2 border-t border-base-300/70 pt-3">
		<p class="truncate px-3.5 pb-1 text-xs text-base-content/50" title={data.account.email}>
			{data.account.email}
		</p>
		<a href={resolve('/(public)/auth/logout')} data-sveltekit-reload class="nav-item">
			<SignOutIcon class="size-6 rtl:rotate-180" />
			<span>Sign out</span>
		</a>
	</div>
</nav>

<main
	id="main"
	tabindex="-1"
	class="page-view min-h-[calc(100dvh-env(safe-area-inset-top))] w-full pb-[calc(4rem+env(safe-area-inset-bottom))] outline-none md:ps-60 md:pb-0"
>
	{@render children()}
</main>

<!-- Phone tab bar -->
<nav aria-label="Main" class="tabbar md:hidden">
	{#each bar.tabs as item (item.path)}
		{@const isActive = item.path === active}
		<!-- eslint-disable svelte/no-navigation-without-resolve -- fixed app paths from navigation.ts -->
		<a
			href={item.path}
			data-sveltekit-preload-data="tap"
			aria-current={isActive ? 'page' : undefined}
			class="tabbar-item"
			class:tabbar-item-active={isActive}
			><!-- eslint-enable svelte/no-navigation-without-resolve -->
			<span class="tabbar-icon">{@render glyph(item, isActive)}</span>
			<span class="tabbar-label">{item.label}</span>
		</a>
	{/each}

	{#if bar.overflow.length > 0}
		<button
			type="button"
			class="tabbar-item"
			class:tabbar-item-active={overflowActive || moreOpen}
			aria-haspopup="dialog"
			aria-expanded={moreOpen}
			onclick={() => (moreOpen = true)}
		>
			<span class="tabbar-icon">
				{#if overflowActive || moreOpen}
					<MoreFilledIcon class="size-6" />
				{:else}
					<MoreIcon class="size-6" />
				{/if}
			</span>
			<span class="tabbar-label">More</span>
		</button>
	{/if}
</nav>

<Modal bind:open={moreOpen} title="More" position="bottom">
	<ul class="flex flex-col gap-1 pb-2">
		{#each bar.overflow as item, index (item.path)}
			{@const isActive = item.path === active}
			{#if item.section && bar.overflow[index - 1]?.section !== item.section}
				<li
					class="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-base-content/40 uppercase"
				>
					{item.section}
				</li>
			{/if}
			<li class="animate-rise-in stagger" style:--i={index}>
				<!-- eslint-disable svelte/no-navigation-without-resolve -- fixed app paths from navigation.ts -->
				<a
					href={item.path}
					aria-current={isActive ? 'page' : undefined}
					class="nav-item py-3"
					class:nav-item-active={isActive}
					><!-- eslint-enable svelte/no-navigation-without-resolve -->
					{@render glyph(item, isActive)}
					<span class="flex-1">{item.label}</span>
					<ChevronIcon class="size-5 opacity-40 rtl:rotate-180" />
				</a>
			</li>
		{/each}
	</ul>
</Modal>
