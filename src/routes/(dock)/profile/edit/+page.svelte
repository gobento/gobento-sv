<!-- src/routes/(dock)/profile/edit/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import IconUser from '~icons/fluent/person-24-regular';
	import IconBuilding from '~icons/fluent/building-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconCheck from '~icons/fluent/checkmark-24-regular';
	import IconImage from '~icons/fluent/image-24-regular';
	import IconUpload from '~icons/fluent/arrow-upload-24-regular';
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconBank from '~icons/fluent/building-bank-24-regular';
	import FluentPayment24Regular from '~icons/fluent/payment-24-regular';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconStar from '~icons/fluent/star-24-filled';
	import BaseLayout from '$lib/components/BaseLayout.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let saving = $state(false);
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(data.profilePictureUrl);
	let fileInputError = $state<string | null>(null);
	let formError = $state<string | null>(null);

	// Form fields
	let editName = $state(data.profile?.name || '');
	let editDescription = $state(data.profile?.description || '');

	// Payment fields
	let ibanEnabled = $state(
		data.account.accountType === 'business'
			? data.wallet?.ibanEnabled || false
			: data.profile?.ibanEnabled || false
	);
	let tetherEnabled = $state(
		data.account.accountType === 'business'
			? data.wallet?.tetherEnabled || false
			: data.profile?.tetherEnabled || false
	);
	let ibanNumber = $state(
		data.account.accountType === 'business'
			? data.wallet?.ibanNumber || ''
			: data.profile?.ibanNumber || ''
	);
	let tetherAddress = $state(
		data.account.accountType === 'business'
			? data.wallet?.tetherAddress || ''
			: data.profile?.tetherAddress || ''
	);
	let preferredPaymentMethod = $state<'iban' | 'tether'>(
		data.account.accountType === 'business'
			? data.wallet?.preferredPaymentMethod || 'iban'
			: data.profile?.preferredPaymentMethod || 'iban'
	);

	let hasExistingPicture = $state(!!data.profile?.profilePictureId);
	let keepExistingPicture = $state(hasExistingPicture);

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		if (!file.type.startsWith('image/')) {
			fileInputError = 'Only images are allowed';
			input.value = '';
			return;
		}

		const maxSize = 5 * 1024 * 1024;
		if (file.size > maxSize) {
			fileInputError = 'File size must be less than 5MB';
			input.value = '';
			return;
		}

		fileInputError = null;
		selectedFile = file;
		keepExistingPicture = false;

		if (previewUrl && !hasExistingPicture) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = URL.createObjectURL(file);
	}

	function getAccountTypeConfig(type: string) {
		switch (type) {
			case 'business':
				return {
					icon: IconBuilding,
					namePlaceholder: 'Enter your business name',
					descriptionPlaceholder: 'Tell customers about your business, products, and services...',
					needsProfile: true
				};
			case 'charity':
				return {
					icon: IconHeart,
					namePlaceholder: 'Enter your organization name',
					descriptionPlaceholder:
						'Share your mission, impact, and how people can support your cause...',
					needsProfile: true
				};
			default:
				return {
					icon: IconUser,
					namePlaceholder: '',
					descriptionPlaceholder: '',
					needsProfile: false
				};
		}
	}

	const config = $derived(getAccountTypeConfig(data.account.accountType));
	const isBusiness = $derived(data.account.accountType === 'business');
	const isUser = $derived(data.account.accountType === 'user');
	const needsProfile = $derived(config.needsProfile);

	// Check how many payment methods are enabled
	const enabledPaymentMethodsCount = $derived((ibanEnabled ? 1 : 0) + (tetherEnabled ? 1 : 0));
	const showPreferredSelection = $derived(enabledPaymentMethodsCount > 1);

	const canSave = $derived(() => {
		// Must have at least one payment method
		if (!ibanEnabled && !tetherEnabled) return false;

		// Validate enabled payment methods have data
		if (ibanEnabled && !ibanNumber.trim()) return false;
		if (tetherEnabled && !tetherAddress.trim()) return false;

		// If business/charity, need profile info
		if (needsProfile) {
			if (!editName.trim() || !editDescription.trim()) return false;
			if (!selectedFile && !keepExistingPicture) return false;
		}

		return true;
	});

	// Auto-adjust preferred method if disabled
	$effect(() => {
		if (preferredPaymentMethod === 'iban' && !ibanEnabled && tetherEnabled) {
			preferredPaymentMethod = 'tether';
		} else if (preferredPaymentMethod === 'tether' && !tetherEnabled && ibanEnabled) {
			preferredPaymentMethod = 'iban';
		}
	});

	// Prevent disabling the last payment method
	function handleIbanToggle() {
		if (ibanEnabled && !tetherEnabled) {
			formError = 'At least one payment method must be enabled';
			return;
		}
		ibanEnabled = !ibanEnabled;
		formError = null;
	}

	function handleTetherToggle() {
		if (tetherEnabled && !ibanEnabled) {
			formError = 'At least one payment method must be enabled';
			return;
		}
		tetherEnabled = !tetherEnabled;
		formError = null;
	}
</script>

<BaseLayout
	title={isUser ? 'Payment Settings' : 'Edit Profile'}
	description={isUser
		? 'Configure your payment methods'
		: `Update your profile and payment settings`}
	icon={IconEdit}
>
	<form
		method="POST"
		action="?/updateProfile"
		enctype="multipart/form-data"
		use:enhance={() => {
			saving = true;
			formError = null;
			return async ({ result, update }) => {
				saving = false;
				if (result.type === 'success') {
					await update();
					goto('/profile');
				} else if (result.type === 'failure' && result.data) {
					const errorData = result.data as { error?: string };
					formError = errorData.error || 'Failed to update profile';
					await update();
				}
			};
		}}
		class="mx-auto max-w-2xl space-y-6 pb-28"
	>
		{#if needsProfile && !isUser}
			<!-- Profile Section -->
			<div class="card border border-base-300 bg-base-100 shadow-sm">
				<div class="card-body gap-6">
					<div class="flex items-start gap-3">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
						>
							<config.icon class="size-5" />
						</div>
						<div class="flex-1">
							<h2 class="text-base font-semibold">Profile Information</h2>
							<p class="text-sm text-base-content/60">How your profile appears to others</p>
						</div>
					</div>

					<!-- Profile Picture -->
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium">Profile Picture</span>
							<span class="badge badge-ghost badge-sm text-error">Required</span>
						</div>

						<div class="flex items-center gap-6">
							{#if previewUrl}
								<div class="avatar">
									<div
										class="w-24 rounded-2xl ring ring-base-300 ring-offset-2 ring-offset-base-100"
									>
										<img src={previewUrl} alt="Preview" />
									</div>
								</div>
							{:else}
								<div
									class="flex size-24 items-center justify-center rounded-2xl bg-base-200 ring ring-base-300 ring-offset-2 ring-offset-base-100"
								>
									<IconImage class="size-10 opacity-30" />
								</div>
							{/if}

							<div class="flex flex-col gap-2">
								<label class="btn gap-2 btn-outline btn-sm">
									<IconUpload class="size-4" />
									{selectedFile ? 'Change Picture' : 'Upload Picture'}
									<input
										type="file"
										name="profilePicture"
										accept="image/*"
										class="hidden"
										onchange={handleFileSelect}
										disabled={saving}
									/>
								</label>

								{#if selectedFile}
									<div class="flex items-center gap-2">
										<div class="badge gap-1 badge-sm badge-success">
											<IconCheck class="size-3" />
											Ready
										</div>
										<span class="max-w-40 truncate text-xs opacity-60">{selectedFile.name}</span>
									</div>
								{:else if keepExistingPicture}
									<span class="text-xs opacity-60">Using current picture</span>
								{:else}
									<span class="text-xs opacity-60">JPG or PNG, up to 5MB</span>
								{/if}
							</div>
						</div>

						{#if fileInputError}
							<p class="text-xs text-error">{fileInputError}</p>
						{/if}
					</div>

					<div class="divider my-0"></div>

					<!-- Name -->
					<div class="form-control">
						<label for="name" class="mb-1.5 flex items-center justify-between">
							<span class="text-sm font-medium">
								{data.account.accountType === 'business' ? 'Business Name' : 'Organization Name'}
							</span>
							<span class="badge badge-ghost badge-sm text-error">Required</span>
						</label>
						<input
							id="name"
							name="name"
							type="text"
							bind:value={editName}
							placeholder={config.namePlaceholder}
							class="input-bordered input w-full"
							required
							disabled={saving}
						/>
					</div>

					<!-- Description -->
					<div class="form-control">
						<label for="description" class="mb-1.5 flex items-center justify-between">
							<span class="text-sm font-medium">Description</span>
							<span class="badge badge-ghost badge-sm text-error">Required</span>
						</label>
						<textarea
							id="description"
							name="description"
							bind:value={editDescription}
							placeholder={config.descriptionPlaceholder}
							class="textarea-bordered textarea h-32 w-full resize-none"
							required
							disabled={saving}></textarea>
						<span class="mt-1 text-xs opacity-60">{editDescription.length} characters</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Payment Settings -->
		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body gap-6">
				<div class="flex items-start gap-3">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
					>
						<IconWallet class="size-5" />
					</div>
					<div class="flex-1">
						<h2 class="text-base font-semibold">Payment Methods</h2>
						<p class="text-sm text-base-content/60">Configure how you receive payments</p>
					</div>
				</div>

				<div class="space-y-3">
					<!-- IBAN Payment Method -->
					<div
						class="group rounded-2xl border-2 transition-all duration-200 {ibanEnabled &&
						(!showPreferredSelection || preferredPaymentMethod === 'iban')
							? 'border-primary'
							: 'border-base-300'} {ibanEnabled &&
						showPreferredSelection &&
						preferredPaymentMethod === 'iban'
							? 'bg-primary/5 shadow-sm'
							: ''}"
					>
						<div class="flex items-start gap-4 p-4">
							<input
								type="checkbox"
								class="checkbox mt-0.5 shrink-0 checkbox-primary"
								checked={ibanEnabled}
								onclick={handleIbanToggle}
								disabled={saving}
							/>

							<div class="flex-1 space-y-3">
								<div class="flex items-center justify-between gap-3">
									<button
										type="button"
										class="flex flex-1 items-center gap-2.5 text-left transition-opacity"
										class:opacity-50={!ibanEnabled}
										onclick={() => {
											if (ibanEnabled && showPreferredSelection) {
												preferredPaymentMethod = 'iban';
											}
										}}
										disabled={!ibanEnabled || !showPreferredSelection || saving}
									>
										<div
											class="flex size-10 items-center justify-center rounded-xl transition-colors {ibanEnabled
												? 'bg-primary/10 text-primary'
												: 'bg-base-200'}"
										>
											<IconBank class="size-5" />
										</div>
										<div>
											<div class="font-semibold">Bank Transfer</div>
											<div class="text-xs opacity-60">IBAN • SEPA</div>
										</div>
									</button>

									{#if showPreferredSelection && ibanEnabled}
										<button
											type="button"
											class="btn btn-circle btn-ghost transition-all btn-sm"
											class:btn-primary={preferredPaymentMethod === 'iban'}
											class:scale-110={preferredPaymentMethod === 'iban'}
											onclick={() => (preferredPaymentMethod = 'iban')}
											disabled={saving}
											class:fill-current={preferredPaymentMethod === 'iban'}
											class:opacity-30={preferredPaymentMethod !== 'iban'}
										>
											<IconStar class="size-5 transition-all" />
										</button>
									{/if}
								</div>

								{#if ibanEnabled}
									<div class="space-y-2 pt-1">
										<input
											name="ibanNumber"
											type="text"
											bind:value={ibanNumber}
											placeholder="DE89 3704 0044 0532 0130 00"
											class="input-bordered input input-sm w-full font-mono text-xs"
											required
											disabled={saving}
										/>
										<p class="text-xs opacity-60">
											International Bank Account Number for EUR transfers
										</p>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Tether Payment Method -->
					<div
						class="group rounded-2xl border-2 transition-all duration-200 {tetherEnabled &&
						(!showPreferredSelection || preferredPaymentMethod === 'tether')
							? 'border-primary'
							: 'border-base-300'} {tetherEnabled &&
						showPreferredSelection &&
						preferredPaymentMethod === 'tether'
							? 'bg-primary/5 shadow-sm'
							: ''}"
					>
						<div class="flex items-start gap-4 p-4">
							<input
								type="checkbox"
								class="checkbox mt-0.5 shrink-0 checkbox-primary"
								checked={tetherEnabled}
								onclick={handleTetherToggle}
								disabled={saving}
							/>

							<div class="flex-1 space-y-3">
								<div class="flex items-center justify-between gap-3">
									<button
										type="button"
										class="flex flex-1 items-center gap-2.5 text-left transition-opacity"
										class:opacity-50={!tetherEnabled}
										onclick={() => {
											if (tetherEnabled && showPreferredSelection) {
												preferredPaymentMethod = 'tether';
											}
										}}
										disabled={!tetherEnabled || !showPreferredSelection || saving}
									>
										<div
											class="flex size-10 items-center justify-center rounded-xl transition-colors {tetherEnabled
												? 'bg-primary/10 text-primary'
												: 'bg-base-200'}"
										>
											<FluentPayment24Regular class="size-5" />
										</div>
										<div>
											<div class="font-semibold">Cryptocurrency</div>
											<div class="text-xs opacity-60">USDT • Ethereum</div>
										</div>
									</button>

									{#if showPreferredSelection && tetherEnabled}
										<button
											type="button"
											class="btn btn-circle btn-ghost transition-all btn-sm"
											class:btn-primary={preferredPaymentMethod === 'tether'}
											class:scale-110={preferredPaymentMethod === 'tether'}
											onclick={() => (preferredPaymentMethod = 'tether')}
											disabled={saving}
											class:fill-current={preferredPaymentMethod === 'tether'}
											class:opacity-30={preferredPaymentMethod !== 'tether'}
										>
											<IconStar class="size-5 transition-all" />
										</button>
									{/if}
								</div>

								{#if tetherEnabled}
									<div class="space-y-2 pt-1">
										<input
											name="tetherAddress"
											type="text"
											bind:value={tetherAddress}
											placeholder="0x..."
											class="input-bordered input input-sm w-full font-mono text-xs"
											required
											disabled={saving}
										/>
										<p class="text-xs opacity-60">ERC-20 USDT wallet address on Ethereum network</p>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>

				{#if showPreferredSelection}
					<div class="alert border-0 bg-base-200/50">
						<IconInfo class="size-5 shrink-0 opacity-70" />
						<div class="text-sm opacity-80">
							<span class="font-medium">Primary method:</span>
							{#if isBusiness}
								receives payments when customers use a different method
							{:else}
								used for automatic conversions when needed
							{/if}
						</div>
					</div>
				{/if}

				{#if enabledPaymentMethodsCount === 0}
					<div class="alert alert-warning">
						<IconInfo class="size-5 shrink-0" />
						<span class="text-sm">Please enable at least one payment method</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Hidden inputs -->
		<input type="hidden" name="ibanEnabled" value={ibanEnabled} />
		<input type="hidden" name="tetherEnabled" value={tetherEnabled} />
		<input type="hidden" name="preferredPaymentMethod" value={preferredPaymentMethod} />

		{#if formError}
			<div class="alert alert-error shadow-sm">
				<IconInfo class="size-5 shrink-0" />
				<span class="text-sm">{formError}</span>
			</div>
		{/if}

		<!-- Sticky Action Bar -->
		<div
			class="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100/95 p-4 backdrop-blur md:ps-58"
		>
			<div class="mx-auto flex max-w-2xl gap-3">
				<a href="/profile" class="btn flex-1 btn-ghost" class:btn-disabled={saving}>Cancel</a>
				<button
					type="submit"
					class="btn flex-[2] gap-2 btn-primary"
					disabled={saving || !canSave()}
				>
					{#if saving}
						<span class="loading loading-sm loading-spinner"></span>
						Saving...
					{:else}
						<IconCheck class="size-5" />
						Save Changes
					{/if}
				</button>
			</div>
		</div>
	</form>
</BaseLayout>
