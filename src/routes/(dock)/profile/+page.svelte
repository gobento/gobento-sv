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

<div class="mx-auto w-full max-w-3xl space-y-6 p-4 pt-6 sm:p-6">
	<!-- Hero Header -->
	<div class="card overflow-hidden bg-base-100 shadow-sm">
		<div class="h-28 bg-linear-to-br from-primary via-primary to-accent sm:h-32"></div>

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
			{:else if isUser}
				<h1 class="mt-4 text-2xl font-bold sm:text-3xl">My Profile</h1>
			{:else if isAdmin}
				<h1 class="mt-4 text-2xl font-bold sm:text-3xl">Administrator</h1>
			{:else if canEdit && (isBusiness || isCharity)}
				<h1 class="mt-4 text-2xl font-bold text-base-content/50 sm:text-3xl">Profile Incomplete</h1>
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
		{#if isUser}
			<!-- User-specific minimal view - only email and payment -->
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
						{#if data.profile.preferredPaymentMethod === 'zarinpal'}
							<p class="font-semibold">Zarinpal (IRR)</p>
							{#if data.profile.zarinpalMerchantId}
								<p class="mt-0.5 font-mono text-xs text-base-content/60">
									ID: {data.profile.zarinpalMerchantId.slice(0, 8)}••••
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
				<div class="tooltip" data-tip="Private - only you can see this">
					<IconLock class="size-4 text-base-content/40" />
				</div>
			</div>
		{:else}
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
				{#if data.wallet && (data.wallet.zarinpalEnabled || data.wallet.tetherEnabled)}
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
							{#if data.wallet.zarinpalEnabled}
								<p class="font-semibold">Zarinpal (IRR)</p>
								<p class="mt-0.5 font-mono text-xs text-base-content/60">
									ID: {data.wallet.zarinpalMerchantId?.slice(0, 8)}••••
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
		{/if}
	</div>

	<!-- Action Buttons -->
	<div class="flex flex-col gap-3 sm:flex-row">
		{#if canEdit}
			<a href="/profile/edit" class="btn flex-1 gap-2 btn-primary">
				<IconEdit class="size-5" />
				{#if isUser}
					Edit Payment Settings
				{:else if hasProfile}
					Edit Profile
				{:else}
					Complete Profile
				{/if}
			</a>
		{/if}

		{#if data.account.accountType === 'user'}
			<a href="/impact" class="btn flex-1 gap-2 btn-outline">
				<IconLeaf class="size-5" />
				Your Impact
			</a>
		{/if}

		<a href="/auth/logout" class="btn gap-2 btn-ghost text-error sm:flex-none">
			<IconSignOut class="size-5" />
			Logout
		</a>
	</div>

	<!-- Footer Links -->
	<div class="flex flex-col gap-2 pt-2">
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
	</div>
</div>
