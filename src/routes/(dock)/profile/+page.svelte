<!-- src/routes/(dock)/profile/+page.svelte -->
<script lang="ts">
	import type { Component } from 'svelte';
	import type { PageData } from './$types';
	import IconUser from '~icons/fluent/person-24-regular';
	import IconBuilding from '~icons/fluent/building-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconShield from '~icons/fluent/shield-24-regular';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconMail from '~icons/fluent/mail-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconLock from '~icons/fluent/lock-closed-24-regular';
	import IconLeaf from '~icons/fluent/leaf-24-regular';
	import IconSignOut from '~icons/fluent/sign-out-24-regular';
	import IconChevronRight from '~icons/fluent/chevron-right-24-regular';
	import IconReceipt from '~icons/fluent/receipt-24-regular';
	import IconSettings from '~icons/fluent/settings-24-regular';
	import FluentBuildingShop24Regular from '~icons/fluent/building-shop-24-regular';
	import { formatDate } from '$lib/util';
	import OptimizedLogoImage from '$lib/components/images/OptimizedLogoImage.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const canEdit = $derived(
		data.account.accountType === 'business' ||
			data.account.accountType === 'charity' ||
			data.account.accountType === 'user'
	);

	const hasProfile = $derived(data.profile !== null);
	const isBusiness = $derived(data.account.accountType === 'business');
	const isCharity = $derived(data.account.accountType === 'charity');
	const isUser = $derived(data.account.accountType === 'user');
	const isAdmin = $derived(data.account.accountType === 'admin');

	const businessTypeLabels: Record<string, string> = {
		bakery: 'Bakery',
		restaurant: 'Restaurant',
		cafe: 'Café',
		grocery: 'Grocery Store',
		supermarket: 'Supermarket',
		hotel: 'Hotel',
		catering: 'Catering',
		other: 'Other'
	};

	function getAccountTypeConfig(type: string) {
		switch (type) {
			case 'business':
				return {
					icon: IconBuilding,
					label: 'Business Account',
					emptyMessage: 'Complete your profile to start offering surprise bags'
				};
			case 'charity':
				return {
					icon: IconHeart,
					label: 'Charity Account',
					emptyMessage: 'Complete your profile to connect with supporters'
				};
			case 'admin':
				return {
					icon: IconShield,
					label: 'Administrator',
					emptyMessage: ''
				};
			default:
				return {
					icon: IconUser,
					label: 'User Account',
					emptyMessage: ''
				};
		}
	}

	const config = $derived(getAccountTypeConfig(data.account.accountType));

	// Format wallet address for display (show first 6 and last 4 characters)
	function formatWalletAddress(address: string): string {
		if (!address) return '';
		if (address.length <= 10) return address;
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	}

	function currencySymbol(currency: string): string {
		return currency === 'EUR' ? '€' : `${currency} `;
	}
</script>

{#snippet infoItem(Icon: Component, label: string, value: string)}
	<div class="flex items-center gap-4 rounded-2xl border border-base-300 bg-base-100 p-4">
		<div
			class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
		>
			<Icon class="size-5" />
		</div>
		<div class="min-w-0 flex-1">
			<p class="text-xs font-medium tracking-wide text-base-content/50 uppercase">{label}</p>
			<p class="truncate font-semibold">{value}</p>
		</div>
	</div>
{/snippet}

{#if isUser}
	<!-- Plain settings screen for regular users -->
	<div class="mx-auto w-full max-w-2xl space-y-8 p-4 pt-6 sm:p-6">
		<!-- Header -->
		<div class="flex items-center gap-3">
			<div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
				<IconSettings class="size-6" />
			</div>
			<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
		</div>

		<!-- Account -->
		<section class="space-y-3">
			<h2 class="px-1 text-xs font-semibold tracking-wide text-base-content/50 uppercase">
				Account
			</h2>

			{@render infoItem(IconMail, 'Email Address', data.account.email)}

			<!-- Payment Method -->
			<div class="flex items-center gap-4 rounded-2xl border border-base-300 bg-base-100 p-4">
				<div
					class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
				>
					<IconWallet class="size-5" />
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-xs font-medium tracking-wide text-base-content/50 uppercase">
						Payment Method
					</p>
					{#if data.profile?.preferredPaymentMethod}
						{#if data.profile.preferredPaymentMethod === 'iban'}
							<p class="font-semibold">Bank Transfer (IBAN)</p>
							{#if data.profile.ibanNumber}
								<p class="mt-0.5 font-mono text-xs text-base-content/60">
									{formatWalletAddress(data.profile.ibanNumber)}
								</p>
							{/if}
						{:else if data.profile.preferredPaymentMethod === 'tether'}
							<p class="font-semibold">USDT (ERC-20)</p>
							{#if data.profile.tetherAddress}
								<p class="mt-0.5 font-mono text-xs text-base-content/60">
									{formatWalletAddress(data.profile.tetherAddress)}
								</p>
							{/if}
						{/if}
					{:else}
						<p class="text-sm text-base-content/60">Not configured</p>
					{/if}
				</div>
				<a href="/profile/edit" class="btn gap-1.5 btn-ghost btn-sm">
					<IconEdit class="size-4" />
					Edit
				</a>
			</div>
		</section>

		{#if data.userImpact}
			<!-- Activity -->
			<section class="space-y-3">
				<h2 class="px-1 text-xs font-semibold tracking-wide text-base-content/50 uppercase">
					Activity
				</h2>

				<!-- Your Impact -->
				<a
					href="/impact"
					class="group card overflow-hidden bg-linear-to-br from-success to-accent text-white shadow-sm transition hover:shadow-md"
				>
					<div class="card-body gap-4 p-5">
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2 font-semibold">
								<IconLeaf class="size-5" />
								Your Impact
							</span>
							<IconChevronRight class="size-5 opacity-70 transition group-hover:translate-x-0.5" />
						</div>
						{#if data.userImpact.mealsRescued > 0}
							<div class="grid grid-cols-3 gap-2">
								<div>
									<p class="text-xl font-bold sm:text-2xl">
										{currencySymbol(data.userImpact.currency)}{data.userImpact.moneySaved.toFixed(
											2
										)}
									</p>
									<p class="text-xs text-white/70">Saved</p>
								</div>
								<div>
									<p class="text-xl font-bold sm:text-2xl">{data.userImpact.mealsRescued}</p>
									<p class="text-xs text-white/70">Meals rescued</p>
								</div>
								<div>
									<p class="text-xl font-bold sm:text-2xl">{data.userImpact.co2Saved} kg</p>
									<p class="text-xs text-white/70">CO₂ prevented</p>
								</div>
							</div>
						{:else}
							<p class="text-sm text-white/80">
								Rescue your first meal to start building your impact.
							</p>
						{/if}
					</div>
				</a>

				<!-- Receipts & Orders -->
				<a
					href="/reservations"
					class="group card border border-base-300 bg-base-100 shadow-sm transition hover:bg-base-200/50"
				>
					<div class="card-body flex-row items-center gap-4 p-5">
						<div
							class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
						>
							<IconReceipt class="size-5" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="font-semibold">Receipts & Orders</p>
							<p class="text-sm text-base-content/60">
								{#if data.userImpact.activeReservations > 0}
									{data.userImpact.activeReservations} active pickup{data.userImpact
										.activeReservations === 1
										? ''
										: 's'} ·
								{/if}
								{data.userImpact.receiptCount} receipt{data.userImpact.receiptCount === 1
									? ''
									: 's'} available
							</p>
						</div>
						<IconChevronRight
							class="size-5 shrink-0 text-base-content/40 transition group-hover:translate-x-0.5"
						/>
					</div>
				</a>
			</section>
		{/if}

		<!-- More -->
		<section class="space-y-1">
			<h2 class="px-1 pb-2 text-xs font-semibold tracking-wide text-base-content/50 uppercase">
				More
			</h2>
			<a
				href="/about"
				class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-base-content/70 transition-colors hover:bg-base-200"
			>
				<IconInfo class="size-5" />
				<span class="flex-1">About & Legal</span>
				<IconChevronRight class="size-4 text-base-content/40" />
			</a>
			<a
				href="/contact"
				class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-base-content/70 transition-colors hover:bg-base-200"
			>
				<IconMail class="size-5" />
				<span class="flex-1">Contact</span>
				<IconChevronRight class="size-4 text-base-content/40" />
			</a>

			<div class="my-1 border-t border-base-200"></div>

			<a
				href="/auth/logout"
				class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-error/80 transition-colors hover:bg-error/10 hover:text-error"
			>
				<IconSignOut class="size-5" />
				<span class="flex-1">Logout</span>
				<IconChevronRight class="size-4 opacity-40" />
			</a>
		</section>
	</div>
{:else}
	<div class="mx-auto w-full max-w-3xl space-y-6 p-4 pt-6 sm:p-6">
		<!-- Hero Header -->
		<div class="card overflow-hidden bg-base-100 shadow-sm">
			<div class="relative h-28 bg-linear-to-br from-primary via-primary to-accent sm:h-32">
				{#if canEdit}
					<a
						href="/profile/edit"
						class="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/25"
						aria-label={hasProfile ? 'Edit profile' : 'Complete profile'}
					>
						<IconEdit class="size-4" />
						<span class="hidden sm:inline">
							{#if hasProfile}
								Edit
							{:else}
								Complete
							{/if}
						</span>
					</a>
				{/if}
			</div>

			<div class="-mt-14 flex flex-col items-center px-6 pb-6 text-center sm:-mt-16">
				<!-- Avatar -->
				<div class="rounded-2xl bg-base-100 p-1.5 shadow-lg">
					{#if (isBusiness || isCharity) && data.profilePictureUrl}
						<OptimizedLogoImage
							src={data.profilePictureUrl}
							alt={'Profile'}
							size="lg"
							shape="square"
							priority={true}
						/>
					{:else}
						<div class="flex size-24 items-center justify-center rounded-xl bg-base-200">
							<config.icon class="size-12 text-base-content/30" />
						</div>
					{/if}
				</div>

				<!-- Name / Title -->
				{#if hasProfile && data.profile && (isBusiness || isCharity)}
					<h1 class="mt-4 text-2xl font-bold sm:text-3xl">{data.profile.name}</h1>
					<p class="mt-2 max-w-xl text-base-content/70">{data.profile.description}</p>
				{:else if isAdmin}
					<h1 class="mt-4 text-2xl font-bold sm:text-3xl">Administrator</h1>
				{:else if canEdit && (isBusiness || isCharity)}
					<h1 class="mt-4 text-2xl font-bold text-base-content/50 sm:text-3xl">
						Profile Incomplete
					</h1>
					<p class="mt-2 text-base-content/60">{config.emptyMessage}</p>
				{/if}

				<!-- Account Type Badge -->
				<div class="badge mt-4 gap-2 badge-lg badge-primary badge-outline">
					<config.icon class="size-4" />
					<span>{config.label}</span>
				</div>
			</div>
		</div>

		<!-- Info Section -->
		<div class="grid gap-3 sm:grid-cols-2">
			<!-- Business/Charity/Admin view -->
			{@render infoItem(
				IconCalendar,
				isAdmin ? 'Admin Since' : 'Saving food since',
				formatDate(data.account.createdAt)
			)}

			{#if isBusiness && data.profile}
				{@render infoItem(
					FluentBuildingShop24Regular,
					'Business Type',
					businessTypeLabels[data.profile.businessType] || data.profile.businessType || ''
				)}

				{@render infoItem(IconLocation, 'Country', data.profile.country)}

				<!-- Payment Provider (Business Only) -->
				{#if data.wallet && (data.wallet.ibanEnabled || data.wallet.tetherEnabled)}
					<div class="flex items-center gap-4 rounded-2xl border border-base-300 bg-base-100 p-4">
						<div
							class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
						>
							<IconWallet class="size-5" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-xs font-medium tracking-wide text-base-content/50 uppercase">
								Payment Provider
							</p>
							{#if data.wallet.ibanEnabled}
								<p class="font-semibold">Bank Transfer (IBAN)</p>
								<p class="mt-0.5 font-mono text-xs text-base-content/60">
									{formatWalletAddress(data.wallet.ibanNumber || '')}
								</p>
							{:else if data.wallet.tetherEnabled}
								<p class="font-semibold">USDT (ERC-20)</p>
								<p class="mt-0.5 font-mono text-xs text-base-content/60">
									{formatWalletAddress(data.wallet.tetherAddress || '')}
								</p>
							{/if}
						</div>
						<div class="tooltip" data-tip="Private - only you can see this">
							<IconLock class="size-4 text-base-content/40" />
						</div>
					</div>
				{/if}
			{/if}

			{#if isCharity && data.profile}
				{@render infoItem(IconLocation, 'Country', data.profile.country)}
			{/if}

			{#if isAdmin}
				{@render infoItem(IconShield, 'Access Level', 'Full Access')}
			{/if}
		</div>

		<!-- Primary Call To Action -->
		{#if canEdit && !hasProfile && (isBusiness || isCharity)}
			<a href="/profile/edit" class="btn w-full gap-2 btn-primary">
				<IconEdit class="size-5" />
				Complete Profile
			</a>
		{/if}

		<!-- Footer Links -->
		<div class="flex flex-col gap-1 pt-2">
			<a
				href="/about"
				class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-base-content/70 transition-colors hover:bg-base-200"
			>
				<IconInfo class="size-5" />
				<span class="flex-1">About & Legal</span>
				<IconChevronRight class="size-4 text-base-content/40" />
			</a>
			<a
				href="/contact"
				class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-base-content/70 transition-colors hover:bg-base-200"
			>
				<IconMail class="size-5" />
				<span class="flex-1">Contact</span>
				<IconChevronRight class="size-4 text-base-content/40" />
			</a>

			<div class="my-1 border-t border-base-200"></div>

			<a
				href="/auth/logout"
				class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-error/80 transition-colors hover:bg-error/10 hover:text-error"
			>
				<IconSignOut class="size-5" />
				<span class="flex-1">Logout</span>
				<IconChevronRight class="size-4 opacity-40" />
			</a>
		</div>
	</div>
{/if}
