<!-- src/routes/(dock)/profile/edit/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import IconUser from '~icons/fluent/person-24-regular';
	import IconBuilding from '~icons/fluent/building-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconCheck from '~icons/fluent/checkmark-24-regular';
	import IconImage from '~icons/fluent/image-24-regular';
	import IconUpload from '~icons/fluent/arrow-upload-24-regular';
	import IconWallet from '~icons/fluent/wallet-24-regular';
	import IconShield from '~icons/fluent/shield-24-regular';
	import IconInfo from '~icons/fluent/info-24-regular';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let saving = $state(false);
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(data.profilePictureUrl);
	let fileInputError = $state<string | null>(null);
	let formError = $state<string | null>(null);

	// Form fields for business/charity
	let editName = $state(data.profile?.name || '');
	let editDescription = $state(data.profile?.description || '');

	// Payment provider fields
	let paymentProvider = $state<'zarinpal' | 'tether' | ''>(
		data.account.accountType === 'business'
			? data.wallet?.zarinpalEnabled
				? 'zarinpal'
				: data.wallet?.tetherEnabled
					? 'tether'
					: 'zarinpal'
			: data.profile?.preferredPaymentMethod || ''
	);
	let zarinpalMerchantId = $state(
		data.account.accountType === 'business'
			? data.wallet?.zarinpalMerchantId || ''
			: data.profile?.zarinpalMerchantId || ''
	);
	let tetherAddress = $state(
		data.account.accountType === 'business'
			? data.wallet?.tetherAddress || ''
			: data.profile?.tetherAddress || ''
	);

	// Track if we're using existing picture or new one
	let hasExistingPicture = $state(!!data.profile?.profilePictureId);
	let keepExistingPicture = $state(hasExistingPicture);

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			return;
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			fileInputError = 'Only images are allowed';
			input.value = '';
			return;
		}

		// Validate file size (5MB max)
		const maxSize = 5 * 1024 * 1024;
		if (file.size > maxSize) {
			fileInputError = 'File size must be less than 5MB';
			input.value = '';
			return;
		}

		// Clear error and set file
		fileInputError = null;
		selectedFile = file;
		keepExistingPicture = false;

		// Create preview URL
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
					namePlaceholder: 'Enter name',
					descriptionPlaceholder: 'Enter description...',
					needsProfile: false
				};
		}
	}

	const config = $derived(getAccountTypeConfig(data.account.accountType));
	const isBusiness = $derived(data.account.accountType === 'business');
	const isUser = $derived(data.account.accountType === 'user');
	const needsProfile = $derived(config.needsProfile);

	const canSave = $derived(() => {
		if (isUser) {
			// For users, require a payment method to be configured
			if (!paymentProvider) return false;

			if (paymentProvider === 'zarinpal') {
				return zarinpalMerchantId.trim().length > 0;
			} else if (paymentProvider === 'tether') {
				return tetherAddress.trim().length > 0;
			}

			return false;
		}

		if (!needsProfile) return true;

		const hasBasicInfo =
			editName.trim() && editDescription.trim() && (selectedFile || keepExistingPicture);

		if (isBusiness) {
			if (paymentProvider === 'zarinpal') {
				return hasBasicInfo && zarinpalMerchantId.trim();
			} else if (paymentProvider === 'tether') {
				return hasBasicInfo && tetherAddress.trim();
			}
		}

		return hasBasicInfo;
	});
</script>

<!-- Header -->
<div>
	<h1 class="card-title text-3xl">
		{isUser ? 'Edit Payment Settings' : 'Edit Your Profile'}
	</h1>
	<p class="text-base-content/70">
		{isUser
			? 'Configure your preferred payment method'
			: `Update your profile information${isBusiness ? ' and payment settings' : ''}`}
	</p>
</div>

<!-- Form -->
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
	class="card-body space-y-6"
>
	{#if needsProfile && !isUser}
		<!-- Profile Picture (business/charity only) -->
		<div class="form-control">
			<label class="label">
				<span class="label-text font-medium">Profile Picture</span>
				<span class="label-text-alt text-error">Required</span>
			</label>

			<div
				class="flex flex-col items-center gap-4 rounded-lg border border-base-300 bg-base-200 p-6"
			>
				{#if previewUrl}
					<div class="avatar">
						<div class="w-32 rounded-full ring ring-base-300 ring-offset-2 ring-offset-base-200">
							<img src={previewUrl} alt="Preview" />
						</div>
					</div>
				{:else}
					<div
						class="flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-base-300"
					>
						<IconImage class="h-12 w-12 text-base-content/30" />
					</div>
				{/if}

				<label class="btn gap-2 btn-outline">
					<IconUpload class="size-5" />
					{selectedFile ? 'Change Picture' : 'Choose Picture'}
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
					<div class="text-center">
						<div class="badge gap-1 badge-success">
							<IconCheck class="h-3 w-3" />
							Ready to upload
						</div>
						<p class="mt-2 text-xs text-base-content/60">{selectedFile.name}</p>
					</div>
				{:else if keepExistingPicture}
					<p class="text-sm text-base-content/60">Using current profile picture</p>
				{/if}
			</div>

			{#if fileInputError}
				<label class="label">
					<span class="label-text-alt text-error">{fileInputError}</span>
				</label>
			{/if}
		</div>

		<!-- Name -->
		<div class="form-control">
			<label class="label" for="name">
				<span class="label-text font-medium">
					{data.account.accountType === 'business' ? 'Business Name' : 'Organization Name'}
				</span>
				<span class="label-text-alt text-error">Required</span>
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
			<label class="label" for="description">
				<span class="label-text font-medium">Description</span>
				<span class="label-text-alt text-error">Required</span>
			</label>
			<textarea
				id="description"
				name="description"
				bind:value={editDescription}
				placeholder={config.descriptionPlaceholder}
				class="textarea-bordered textarea h-32 w-full"
				required
				disabled={saving}
			></textarea>
			<label class="label">
				<span class="label-text-alt text-base-content/60">
					{editDescription.length} characters
				</span>
			</label>
		</div>
	{/if}

	{#if isBusiness || isUser}
		<!-- Payment Provider Section -->
		<div class="space-y-4">
			<div class="flex items-start gap-3">
				<IconWallet class="mt-1 size-5 text-primary" />
				<div class="flex-1">
					<h2 class="text-lg font-semibold">Payment Settings</h2>
					<p class="text-sm text-base-content/70">
						{isUser
							? 'Configure your preferred payment method'
							: 'Configure how you receive payments'}
					</p>
				</div>
			</div>

			<!-- Provider Selection -->
			<div class="form-control">
				<label class="label">
					<span class="label-text font-medium">Payment Provider</span>
					<span class="label-text-alt text-error">Required</span>
				</label>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<label
						class="cursor-pointer rounded-lg border-2 p-4 transition-colors hover:border-primary/50"
						class:border-primary={paymentProvider === 'zarinpal'}
						class:bg-primary-5={paymentProvider === 'zarinpal'}
						class:border-base-300={paymentProvider !== 'zarinpal'}
					>
						<div class="flex items-center gap-3">
							<input
								type="radio"
								name="paymentProvider"
								value="zarinpal"
								bind:group={paymentProvider}
								class="radio radio-primary"
								disabled={saving}
							/>
							<div>
								<p class="font-medium">Zarinpal</p>
								<p class="text-xs text-base-content/60">Iranian Rial (IRR)</p>
							</div>
						</div>
					</label>

					<label
						class="cursor-pointer rounded-lg border-2 p-4 transition-colors hover:border-primary/50"
						class:border-primary={paymentProvider === 'tether'}
						class:bg-primary-5={paymentProvider === 'tether'}
						class:border-base-300={paymentProvider !== 'tether'}
					>
						<div class="flex items-center gap-3">
							<input
								type="radio"
								name="paymentProvider"
								value="tether"
								bind:group={paymentProvider}
								class="radio radio-primary"
								disabled={saving}
							/>
							<div>
								<p class="font-medium">USDT</p>
								<p class="text-xs text-base-content/60">Tether (ERC-20)</p>
							</div>
						</div>
					</label>
				</div>
			</div>

			<!-- Zarinpal Configuration -->
			{#if paymentProvider === 'zarinpal'}
				<div class="form-control">
					<label class="label" for="zarinpalMerchantId">
						<span class="label-text font-medium">Zarinpal Merchant ID</span>
						<span class="label-text-alt text-error">Required</span>
					</label>
					<input
						id="zarinpalMerchantId"
						name="zarinpalMerchantId"
						type="text"
						bind:value={zarinpalMerchantId}
						placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
						class="input-bordered input w-full font-mono"
						required
						disabled={saving}
					/>
					<label class="label">
						<span class="label-text-alt flex items-center gap-2 text-base-content/70">
							<IconShield class="h-3 w-3" />
							Your Merchant ID is stored securely and never shared publicly
						</span>
					</label>
				</div>
			{/if}

			<!-- Tether Configuration -->
			{#if paymentProvider === 'tether'}
				<div class="form-control">
					<label class="label" for="tetherAddress">
						<span class="label-text font-medium">USDT Wallet Address (ERC-20)</span>
						<span class="label-text-alt text-error">Required</span>
					</label>
					<input
						id="tetherAddress"
						name="tetherAddress"
						type="text"
						bind:value={tetherAddress}
						placeholder="0x..."
						class="input-bordered input w-full font-mono"
						required
						disabled={saving}
					/>
					<label class="label">
						<span class="label-text-alt flex flex-col gap-2">
							<span class="flex items-center gap-2 text-base-content/70">
								<IconShield class="h-3 w-3" />
								Your wallet address is stored securely and never shared publicly
							</span>
							<span class="flex items-center gap-2 text-warning">
								<IconInfo class="h-3 w-3" />
								Make sure this is an ERC-20 USDT address (Ethereum network)
							</span>
						</span>
					</label>
				</div>
			{/if}
		</div>
	{/if}

	{#if formError}
		<div class="alert alert-error">
			<span>{formError}</span>
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="flex flex-col gap-3 sm:flex-row">
		<button type="submit" class="btn flex-1 gap-2 btn-primary" disabled={saving || !canSave()}>
			{#if saving}
				<span class="loading loading-spinner"></span>
				Saving...
			{:else}
				<IconCheck class="size-5" />
				Save Changes
			{/if}
		</button>
		<a href="/profile" class="btn flex-1 btn-outline" class:btn-disabled={saving}> Cancel </a>
	</div>
</form>
