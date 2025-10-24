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
	import FluentBuildingShop24Regular from '~icons/fluent/building-shop-24-regular';
	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const canEdit = $derived(
		data.account.accountType === 'business' || data.account.accountType === 'charity'
	);

	const hasProfile = $derived(data.profile !== null);

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
</script>

<div class="mx-auto max-w-4xl">
	<div class="bg-base-100">
		<!-- Header Section -->
		<div class="flex flex-col items-center border-b border-base-300 px-6 py-12">
			<!-- Profile Picture -->
			<div class="avatar mb-6">
				<div class="w-32 rounded-full bg-base-200">
					{#if data.profilePictureUrl}
						<img src={data.profilePictureUrl} alt="Profile" />
					{:else}
						<div class="flex h-full w-full items-center justify-center">
							<config.icon class="h-16 w-16 text-base-content/30" />
						</div>
					{/if}
				</div>
			</div>

			<!-- Name/Title -->
			{#if hasProfile && data.profile}
				<h1 class="mb-2 text-3xl font-semibold">{data.profile.name}</h1>
				<p class="mb-4 max-w-2xl text-center text-base-content/70">
					{data.profile.description}
				</p>
			{:else if canEdit}
				<h1 class="mb-2 text-3xl font-semibold text-base-content/50">Profile Incomplete</h1>
				<p class="mb-4 text-sm text-base-content/60">{config.emptyMessage}</p>
			{:else}
				<h1 class="mb-2 text-3xl font-semibold">
					{data.account.accountType === 'admin' ? 'Administrator' : 'My Profile'}
				</h1>
			{/if}

			<!-- Account Type Label -->
			<div class="mb-4 flex items-center gap-2 text-sm text-base-content/60">
				<config.icon class="h-4 w-4" />
				<span>{config.label}</span>
			</div>

			<!-- Email -->
			<p class="text-sm text-base-content/50">{data.account.email}</p>
		</div>

		<!-- Info Section -->
		<div class="px-6 py-8">
			<div class="mx-auto grid max-w-md gap-6">
				<!-- Saving food since -->
				<div class="flex items-center justify-between border-b border-base-300 pb-4">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-base-200">
							<IconCalendar class="h-5 w-5 text-base-content/60" />
						</div>
						<div>
							<p class="text-xs text-base-content/50">Saving food since</p>
							<p class="font-medium">
								{new Date(data.account.createdAt).toLocaleDateString('en-US', {
									month: 'long',
									year: 'numeric'
								})}
							</p>
						</div>
					</div>
				</div>

				{#if data.account.accountType === 'business' && data.profile}
					<!-- Business Type -->
					<div class="flex items-center justify-between border-b border-base-300 pb-4">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-full bg-base-200">
								<FluentBuildingShop24Regular class="h-5 w-5 text-base-content/60" />
							</div>
							<div>
								<p class="text-xs text-base-content/50">Business Type</p>
								<p class="font-medium">
									{businessTypeLabels[data.profile.businessType] || data.profile.businessType || ''}
								</p>
							</div>
						</div>
					</div>

					<!-- Country -->
					<div class="flex items-center justify-between border-b border-base-300 pb-4">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-full bg-base-200">
								<IconLocation class="h-5 w-5 text-base-content/60" />
							</div>
							<div>
								<p class="text-xs text-base-content/50">Country</p>
								<p class="font-medium">{data.profile.country}</p>
							</div>
						</div>
					</div>
				{/if}

				{#if data.account.accountType === 'charity' && data.profile}
					<!-- Country -->
					<div class="flex items-center justify-between border-b border-base-300 pb-4">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-full bg-base-200">
								<IconLocation class="h-5 w-5 text-base-content/60" />
							</div>
							<div>
								<p class="text-xs text-base-content/50">Country</p>
								<p class="font-medium">{data.profile.country}</p>
							</div>
						</div>
					</div>
				{/if}

				{#if data.account.accountType === 'admin'}
					<div class="flex items-center justify-between border-b border-base-300 pb-4">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-full bg-base-200">
								<IconShield class="h-5 w-5 text-base-content/60" />
							</div>
							<div>
								<p class="text-xs text-base-content/50">Access Level</p>
								<p class="font-medium">Full Access</p>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex gap-3 border-t border-base-300 px-6 py-6">
			{#if canEdit}
				<a href="/profile/edit" class="btn flex-1 btn-primary">
					<IconEdit class="h-5 w-5" />
					{hasProfile ? 'Edit Profile' : 'Complete Profile'}
				</a>
			{/if}

			<a href="/auth/logout" class="btn flex-1 btn-outline">Logout</a>
		</div>

		<!-- Footer Links -->
		<div class="border-t border-base-300 px-6 py-4">
			<div class="flex flex-wrap justify-center gap-6 text-sm">
				<a
					href="/about"
					class="flex items-center gap-2 text-base-content/60 hover:text-base-content"
				>
					<IconInfo class="h-4 w-4" />
					<span>About & Legal</span>
				</a>
				<a
					href="/contact"
					class="flex items-center gap-2 text-base-content/60 hover:text-base-content"
				>
					<IconMail class="h-4 w-4" />
					<span>Contact</span>
				</a>
			</div>
		</div>
	</div>
</div>
