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
</script>

<div>
	<h1 class="text-lg font-bold">
		{isUser ? 'Payment Settings' : 'Edit Profile'}
	</h1>
	<p class="mt-2 text-base-content/70">
		{isUser ? 'Configure your payment methods' : `Update your profile and payment settings`}
	</p>
</div>

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
	class="space-y-8"
>
	{#if needsProfile && !isUser}
		<!-- Profile Picture -->
		<div class="space-y-3">
			<label class="flex items-center justify-between text-sm font-medium">
				<span>Profile Picture</span>
				<span class="text-xs text-error">Required</span>
			</label>

			<div
				class="flex flex-col items-center gap-4 rounded-lg border border-base-300 bg-base-100 p-6"
			>
				{#if previewUrl}
					<div class="avatar">
						<div class="w-32 rounded-full">
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

				<label class="btn gap-2 btn-sm">
					<IconUpload class="h-4 w-4" />
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
						<div class="badge gap-1 badge-sm badge-success">
							<IconCheck class="h-3 w-3" />
							Ready
						</div>
						<p class="mt-1 text-xs text-base-content/60">{selectedFile.name}</p>
					</div>
				{:else if keepExistingPicture}
					<p class="text-sm text-base-content/60">Using current picture</p>
				{/if}
			</div>

			{#if fileInputError}
				<p class="text-xs text-error">{fileInputError}</p>
			{/if}
		</div>

		<!-- Name -->
		<div class="space-y-3">
			<label for="name" class="flex items-center justify-between text-sm font-medium">
				<span
					>{data.account.accountType === 'business' ? 'Business Name' : 'Organization Name'}</span
				>
				<span class="text-xs text-error">Required</span>
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
		<div class="space-y-3">
			<label for="description" class="flex items-center justify-between text-sm font-medium">
				<span>Description</span>
				<span class="text-xs text-error">Required</span>
			</label>
			<textarea
				id="description"
				name="description"
				bind:value={editDescription}
				placeholder={config.descriptionPlaceholder}
				class="textarea-bordered textarea h-32 w-full resize-none"
				required
				disabled={saving}
			></textarea>
			<p class="text-xs text-base-content/60">
				{editDescription.length} characters
			</p>
		</div>
	{/if}

	<!-- Payment Settings -->
	<div class="space-y-6">
		<div class="flex items-center gap-3">
			<IconWallet class="size-5 text-primary" />
			<div>
				<h2 class="text-lg font-semibold">Payment Methods</h2>
				<p class="text-sm text-base-content/70">Enable at least one payment method</p>
			</div>
		</div>

		<!-- IBAN -->
		<div class="space-y-3 rounded-lg border border-base-300 bg-base-100 p-4">
			<label class="flex cursor-pointer items-center justify-between">
				<div class="flex items-center gap-3">
					<input
						type="checkbox"
						class="checkbox checkbox-primary"
						bind:checked={ibanEnabled}
						disabled={saving}
					/>
					<div class="flex items-center gap-2">
						<IconBank class="size-5" />
						<span class="font-medium">IBAN</span>
					</div>
				</div>
			</label>

			{#if ibanEnabled}
				<div class="space-y-2 pl-10">
					<input
						name="ibanNumber"
						type="text"
						bind:value={ibanNumber}
						placeholder="DE89 3704 0044 0532 0130 00"
						class="input-bordered input input-sm w-full font-mono"
						required
						disabled={saving}
					/>
					<p class="text-xs text-base-content/60">
						International Bank Account Number for EUR transfers
					</p>
				</div>
			{/if}
		</div>

		<!-- Tether -->
		<div class="space-y-3 rounded-lg border border-base-300 bg-base-100 p-4">
			<label class="flex cursor-pointer items-center justify-between">
				<div class="flex items-center gap-3">
					<input
						type="checkbox"
						class="checkbox checkbox-primary"
						bind:checked={tetherEnabled}
						disabled={saving}
					/>
					<div class="flex items-center gap-2">
						<FluentPayment24Regular class="size-5" />
						<span class="font-medium">USDT (Tether)</span>
					</div>
				</div>
			</label>

			{#if tetherEnabled}
				<div class="space-y-2 pl-10">
					<input
						name="tetherAddress"
						type="text"
						bind:value={tetherAddress}
						placeholder="0x..."
						class="input-bordered input input-sm w-full font-mono"
						required
						disabled={saving}
					/>
					<p class="text-xs text-base-content/60">ERC-20 USDT wallet address (Ethereum network)</p>
				</div>
			{/if}
		</div>

		<!-- Preferred Method -->
		{#if ibanEnabled || tetherEnabled}
			<div class="space-y-3">
				<label class="text-sm font-medium">Preferred Payment Method</label>
				<!-- todo: use a select dropdown for that-->
				<div class="flex gap-3">
					{#if ibanEnabled}
						<label
							class="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition-colors"
							class:border-primary={preferredPaymentMethod === 'iban'}
							class:border-base-300={preferredPaymentMethod !== 'iban'}
						>
							<input
								type="radio"
								name="preferredPaymentMethod"
								value="iban"
								bind:group={preferredPaymentMethod}
								class="radio radio-sm radio-primary"
								disabled={saving}
							/>
							<span class="text-sm font-medium">IBAN</span>
						</label>
					{/if}

					{#if tetherEnabled}
						<label
							class="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition-colors"
							class:border-primary={preferredPaymentMethod === 'tether'}
							class:border-base-300={preferredPaymentMethod !== 'tether'}
						>
							<input
								type="radio"
								name="preferredPaymentMethod"
								value="tether"
								bind:group={preferredPaymentMethod}
								class="radio radio-sm radio-primary"
								disabled={saving}
							/>
							<span class="text-sm font-medium">USDT</span>
						</label>
					{/if}
				</div>
				<p class="text-xs text-base-content/60">
					{isUser
						? 'Your preferred method for receiving payments'
						: 'Customers will see prices in this currency'}
				</p>
			</div>
		{/if}
	</div>

	<!-- Hidden inputs -->
	<input type="hidden" name="ibanEnabled" value={ibanEnabled} />
	<input type="hidden" name="tetherEnabled" value={tetherEnabled} />

	{#if formError}
		<div class="rounded-lg border border-error bg-error/10 p-4">
			<p class="text-sm text-error">{formError}</p>
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="flex gap-3">
		<button type="submit" class="btn flex-1 gap-2 btn-primary" disabled={saving || !canSave()}>
			{#if saving}
				<span class="loading loading-sm loading-spinner"></span>
				Saving...
			{:else}
				<IconCheck class="size-5" />
				Save Changes
			{/if}
		</button>
		<a href="/profile" class="btn flex-1" class:btn-disabled={saving}> Cancel </a>
	</div>
</form>
