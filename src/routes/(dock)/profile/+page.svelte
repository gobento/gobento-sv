<!-- src/routes/(dock)/profile/+page.svelte -->
<script lang="ts">
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
	import FluentBuildingShop24Regular from '~icons/fluent/building-shop-24-regular';
	import { formatDate } from '$lib/util';

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

<div class="card border border-base-300 bg-base-100">
	<!-- Header Section -->
	<div class="card-body items-center border-b border-base-300 text-center">
		<!-- Profile Picture -->
		<div class="avatar mb-6">
			<div class="w-32 rounded-full border-2 border-base-300">
				{#if data.profilePictureUrl && !isUser}
					<img src={data.profilePictureUrl} alt="Profile" />
				{:else}
					<div class="flex h-full w-full items-center justify-center bg-base-200">
						<config.icon class="h-16 w-16 text-base-content/20" />
					</div>
				{/if}
			</div>
		</div>

		<!-- Name/Title -->
		{#if hasProfile && data.profile && (isBusiness || isCharity)}
			<h1 class="mb-2 card-title justify-center text-4xl">{data.profile.name}</h1>
			<p class="mb-4 max-w-2xl text-base text-base-content/70">
				{data.profile.description}
			</p>
		{:else if isUser}
			<h1 class="mb-2 card-title justify-center text-4xl">My Profile</h1>
		{:else if isAdmin}
			<h1 class="mb-2 card-title justify-center text-4xl">Administrator</h1>
		{:else if canEdit && (isBusiness || isCharity)}
			<h1 class="mb-2 card-title justify-center text-4xl text-base-content/40">
				Profile Incomplete
			</h1>
			<p class="mb-4 text-base text-base-content/60">{config.emptyMessage}</p>
		{/if}

		<!-- Account Type Badge -->
		<div class="badge gap-2 badge-outline badge-lg">
			<config.icon class="size-4" />
			<span>{config.label}</span>
		</div>

		<div class="divider my-2"></div>

		<!-- Email -->
		<div class="flex items-center gap-2 text-sm text-base-content/60">
			<IconMail class="size-4" />
			<span>{data.account.email}</span>
		</div>
	</div>

	<!-- Info Section -->
	<div class="card-body">
		<div class="space-y-3">
			{#if isUser}
				<!-- User-specific minimal view - only email and payment -->

				<!-- Email Address -->
				<div class="flex items-center gap-4 border-b border-base-300 pb-4">
					<div
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200"
					>
						<IconMail class="size-5" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-xs font-medium tracking-wider text-base-content/60 uppercase">
							Email Address
						</p>
						<p class="text-base font-semibold">
							{data.account.email}
						</p>
					</div>
				</div>

				<!-- Payment Method -->
				<div class="flex items-center gap-4 border-b border-base-300 pb-4">
					<div
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200"
					>
						<IconWallet class="size-5" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-xs font-medium tracking-wider text-base-content/60 uppercase">
							Payment Method
						</p>
						{#if data.profile?.preferredPaymentMethod}
							<div class="mt-1">
								{#if data.profile.preferredPaymentMethod === 'zarinpal'}
									<p class="text-base font-semibold">Zarinpal (IRR)</p>
									{#if data.profile.zarinpalMerchantId}
										<p class="mt-1 font-mono text-xs text-base-content/60">
											ID: {data.profile.zarinpalMerchantId.slice(0, 8)}••••
										</p>
									{/if}
								{:else if data.profile.preferredPaymentMethod === 'tether'}
									<p class="text-base font-semibold">USDT (ERC-20)</p>
									{#if data.profile.tetherAddress}
										<p class="mt-1 font-mono text-xs text-base-content/60">
											{formatWalletAddress(data.profile.tetherAddress)}
										</p>
									{/if}
								{/if}
							</div>
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

				<!-- Saving food since / Member Since / Admin Since -->
				<div class="flex items-center gap-4 border-b border-base-300 pb-4">
					<div
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200"
					>
						<IconCalendar class="size-5" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-xs font-medium tracking-wider text-base-content/60 uppercase">
							{isAdmin ? 'Admin Since' : 'Saving food since'}
						</p>
						<p class="text-base font-semibold">
							{formatDate(data.account.createdAt)}
						</p>
					</div>
				</div>

				{#if isBusiness && data.profile}
					<!-- Business Type -->
					<div class="flex items-center gap-4 border-b border-base-300 pb-4">
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200"
						>
							<FluentBuildingShop24Regular class="size-5" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-xs font-medium tracking-wider text-base-content/60 uppercase">
								Business Type
							</p>
							<p class="text-base font-semibold">
								{businessTypeLabels[data.profile.businessType] || data.profile.businessType || ''}
							</p>
						</div>
					</div>

					<!-- Country -->
					<div class="flex items-center gap-4 border-b border-base-300 pb-4">
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200"
						>
							<IconLocation class="size-5" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-xs font-medium tracking-wider text-base-content/60 uppercase">
								Country
							</p>
							<p class="text-base font-semibold">{data.profile.country}</p>
						</div>
					</div>

					<!-- Payment Provider (Business Only) -->
					{#if data.wallet && (data.wallet.zarinpalEnabled || data.wallet.tetherEnabled)}
						<div class="flex items-center gap-4 border-b border-base-300 pb-4">
							<div
								class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200"
							>
								<IconWallet class="size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-xs font-medium tracking-wider text-base-content/60 uppercase">
									Payment Provider
								</p>
								<div class="mt-1">
									{#if data.wallet.zarinpalEnabled}
										<p class="text-base font-semibold">Zarinpal (IRR)</p>
										<p class="mt-1 font-mono text-xs text-base-content/60">
											ID: {data.wallet.zarinpalMerchantId?.slice(0, 8)}••••
										</p>
									{:else if data.wallet.tetherEnabled}
										<p class="text-base font-semibold">USDT (ERC-20)</p>
										<p class="mt-1 font-mono text-xs text-base-content/60">
											{formatWalletAddress(data.wallet.tetherAddress || '')}
										</p>
									{/if}
								</div>
							</div>
							<div class="tooltip" data-tip="Private - only you can see this">
								<IconLock class="size-4 text-base-content/40" />
							</div>
						</div>
					{/if}
				{/if}

				{#if isCharity && data.profile}
					<!-- Country -->
					<div class="flex items-center gap-4 border-b border-base-300 pb-4">
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200"
						>
							<IconLocation class="size-5" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-xs font-medium tracking-wider text-base-content/60 uppercase">
								Country
							</p>
							<p class="text-base font-semibold">{data.profile.country}</p>
						</div>
					</div>
				{/if}

				{#if isAdmin}
					<div class="flex items-center gap-4 border-b border-base-300 pb-4">
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200"
						>
							<IconShield class="size-5" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-xs font-medium tracking-wider text-base-content/60 uppercase">
								Access Level
							</p>
							<p class="text-base font-semibold">Full Access</p>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="card-body border-t border-base-300 pt-6">
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
				<a href="/impact" class="btn flex-1 btn-ghost"> Your Impact on Environment </a>
			{/if}

			<a href="/auth/logout" class="btn flex-1 btn-secondary"> Logout </a>
		</div>
	</div>

	<!-- Footer Links -->
	<div class="card-body border-t border-base-300 pt-6">
		<div class="flex flex-wrap justify-center gap-6">
			<a
				href="/about"
				class="flex items-center gap-2 text-sm text-base-content/60 transition-colors hover:text-base-content"
			>
				<IconInfo class="size-4" />
				<span>About & Legal</span>
			</a>
			<a
				href="/contact"
				class="flex items-center gap-2 text-sm text-base-content/60 transition-colors hover:text-base-content"
			>
				<IconMail class="size-4" />
				<span>Contact</span>
			</a>
		</div>
	</div>
</div>
