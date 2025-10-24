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

<div class="mx-auto max-w-4xl px-4 py-8">
	<div class="overflow-hidden rounded-2xl bg-base-100">
		<!-- Header Section -->
		<div class="flex flex-col items-center px-6 py-16">
			<!-- Profile Picture -->
			<div class="avatar mb-8">
				<div class="w-32 rounded-full bg-base-200/50">
					{#if data.profilePictureUrl}
						<img src={data.profilePictureUrl} alt="Profile" />
					{:else}
						<div class="flex h-full w-full items-center justify-center">
							<config.icon class="h-16 w-16 text-base-content/20" />
						</div>
					{/if}
				</div>
			</div>

			<!-- Name/Title -->
			{#if hasProfile && data.profile}
				<h1 class="mb-3 text-4xl font-bold tracking-tight">{data.profile.name}</h1>
				<p class="mb-6 max-w-2xl text-center text-lg text-base-content/60">
					{data.profile.description}
				</p>
			{:else if canEdit}
				<h1 class="mb-3 text-4xl font-bold tracking-tight text-base-content/40">
					Profile Incomplete
				</h1>
				<p class="mb-6 text-base text-base-content/50">{config.emptyMessage}</p>
			{:else}
				<h1 class="mb-3 text-4xl font-bold tracking-tight">
					{data.account.accountType === 'admin' ? 'Administrator' : 'My Profile'}
				</h1>
			{/if}

			<!-- Account Type Badge -->
			<div
				class="mb-5 inline-flex items-center gap-2 rounded-full bg-base-200/50 px-4 py-2 text-sm font-medium text-base-content/70"
			>
				<config.icon class="size-4" />
				<span>{config.label}</span>
			</div>

			<!-- Email -->
			<p class="text-sm text-base-content/40">{data.account.email}</p>
		</div>

		<!-- Info Section -->
		<div class="px-6 pb-8">
			<div class="mx-auto max-w-2xl space-y-3">
				<!-- Saving food since -->
				<div class="flex items-center gap-4 rounded-xl bg-base-200/30 px-5 py-4">
					<div class="flex h-12 w-12 items-center justify-center rounded-full bg-base-200/50">
						<IconCalendar class="h-5 w-5 text-base-content/50" />
					</div>
					<div class="flex-1">
						<p class="text-xs font-medium tracking-wide text-base-content/40 uppercase">
							Saving food since
						</p>
						<p class="mt-1 text-base font-semibold">
							{new Date(data.account.createdAt).toLocaleDateString('en-US', {
								month: 'long',
								year: 'numeric'
							})}
						</p>
					</div>
				</div>

				{#if data.account.accountType === 'business' && data.profile}
					<!-- Business Type -->
					<div class="flex items-center gap-4 rounded-xl bg-base-200/30 px-5 py-4">
						<div class="flex h-12 w-12 items-center justify-center rounded-full bg-base-200/50">
							<FluentBuildingShop24Regular class="h-5 w-5 text-base-content/50" />
						</div>
						<div class="flex-1">
							<p class="text-xs font-medium tracking-wide text-base-content/40 uppercase">
								Business Type
							</p>
							<p class="mt-1 text-base font-semibold">
								{businessTypeLabels[data.profile.businessType] || data.profile.businessType || ''}
							</p>
						</div>
					</div>

					<!-- Country -->
					<div class="flex items-center gap-4 rounded-xl bg-base-200/30 px-5 py-4">
						<div class="flex h-12 w-12 items-center justify-center rounded-full bg-base-200/50">
							<IconLocation class="h-5 w-5 text-base-content/50" />
						</div>
						<div class="flex-1">
							<p class="text-xs font-medium tracking-wide text-base-content/40 uppercase">
								Country
							</p>
							<p class="mt-1 text-base font-semibold">{data.profile.country}</p>
						</div>
					</div>
				{/if}

				{#if data.account.accountType === 'charity' && data.profile}
					<!-- Country -->
					<div class="flex items-center gap-4 rounded-xl bg-base-200/30 px-5 py-4">
						<div class="flex h-12 w-12 items-center justify-center rounded-full bg-base-200/50">
							<IconLocation class="h-5 w-5 text-base-content/50" />
						</div>
						<div class="flex-1">
							<p class="text-xs font-medium tracking-wide text-base-content/40 uppercase">
								Country
							</p>
							<p class="mt-1 text-base font-semibold">{data.profile.country}</p>
						</div>
					</div>
				{/if}

				{#if data.account.accountType === 'admin'}
					<div class="flex items-center gap-4 rounded-xl bg-base-200/30 px-5 py-4">
						<div class="flex h-12 w-12 items-center justify-center rounded-full bg-base-200/50">
							<IconShield class="h-5 w-5 text-base-content/50" />
						</div>
						<div class="flex-1">
							<p class="text-xs font-medium tracking-wide text-base-content/40 uppercase">
								Access Level
							</p>
							<p class="mt-1 text-base font-semibold">Full Access</p>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex gap-3 px-6 py-6">
			{#if canEdit}
				<a href="/profile/edit" class="btn flex-1 btn-primary">
					<IconEdit class="h-5 w-5" />
					{hasProfile ? 'Edit Profile' : 'Complete Profile'}
				</a>
			{/if}

			<a href="/auth/logout" class="btn flex-1 btn-secondary">Logout</a>
		</div>

		<!-- Footer Links -->
		<div class="px-6 py-6">
			<div class="flex flex-wrap justify-center gap-8 text-sm">
				<a
					href="/about"
					class="flex items-center gap-2 text-base-content/50 transition-colors hover:text-base-content/80"
				>
					<IconInfo class="size-4" />
					<span>About & Legal</span>
				</a>
				<a
					href="/contact"
					class="flex items-center gap-2 text-base-content/50 transition-colors hover:text-base-content/80"
				>
					<IconMail class="size-4" />
					<span>Contact</span>
				</a>
			</div>
		</div>
	</div>
</div>
