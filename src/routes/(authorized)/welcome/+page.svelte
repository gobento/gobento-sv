<!-- src/routes/welcome/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import IconBriefcase from '~icons/fluent/briefcase-24-regular';
	import IconPerson from '~icons/fluent/person-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import FluentEmojiFlatBentoBox from '~icons/fluent-emoji-flat/bento-box';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconImage from '~icons/fluent/image-24-regular';
	import IconCloudArrowUp from '~icons/fluent/cloud-arrow-up-24-regular';
	import IconCheckCircle from '~icons/fluent/checkmark-circle-24-filled';
	import IconCheckmark from '~icons/fluent/checkmark-24-regular';
	import IconErrorCircle from '~icons/fluent/error-circle-24-filled';
	import IconWarning from '~icons/fluent/warning-24-filled';
	import FlagGermany from '~icons/circle-flags/de';
	import FlagIran from '~icons/circle-flags/ir';
	import { welcomeSchema } from './schema';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const { form, errors, enhance, submitting, message } = superForm(data.form, {
		validators: valibotClient(welcomeSchema),
		resetForm: false,
		invalidateAll: false
	});

	interface AccountType {
		id: 'user' | 'business' | 'charity';
		title: string;
		description: string;
		icon: any;
	}

	interface Country {
		code: string;
		name: string;
		flag: any;
	}

	interface BusinessType {
		value: string;
		label: string;
	}

	let accountTypes: AccountType[] = [
		{
			id: 'business',
			title: 'Business',
			description: 'Sell surplus food at discounted prices',
			icon: IconBriefcase
		},
		{
			id: 'user',
			title: 'Personal',
			description: 'Save money and help reduce food waste',
			icon: IconPerson
		},
		{
			id: 'charity',
			title: 'Charity',
			description: 'Receive donated food for those in need',
			icon: IconHeart
		}
	];

	let countries: Country[] = [
		{ code: 'Germany', name: 'Germany', flag: FlagGermany },
		{ code: 'Iran', name: 'Iran', flag: FlagIran }
	];

	let businessTypes: BusinessType[] = [
		{ value: 'bakery', label: '🥖 Bakery' },
		{ value: 'restaurant', label: '🍽️ Restaurant' },
		{ value: 'cafe', label: '☕ Café' },
		{ value: 'grocery', label: '🛒 Grocery Store' },
		{ value: 'supermarket', label: '🏪 Supermarket' },
		{ value: 'hotel', label: '🏨 Hotel' },
		{ value: 'catering', label: '🍱 Catering' },
		{ value: 'other', label: '📦 Other' }
	];

	let step = $state<number>(1);
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let fileError = $state<string | null>(null);

	function selectType(id: 'user' | 'business' | 'charity') {
		$form.accountType = id;
		// Reset form fields when switching types
		if ('name' in $form) $form.name = '';
		if ('description' in $form) $form.description = '';
		if ('country' in $form) $form.country = '';
		if ('businessType' in $form) $form.businessType = undefined;
		if ('paymentMethod' in $form) $form.paymentMethod = undefined;
		if ('ibanNumber' in $form) $form.ibanNumber = undefined;
		if ('tetherAddress' in $form) $form.tetherAddress = undefined;
	}

	function handleContinue() {
		if ($form.accountType) {
			step = 2;
		}
	}

	function handleBack() {
		step = 1;
		fileError = null;
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			fileError = null;

			if (file.size > 5 * 1024 * 1024) {
				fileError = 'File size must be less than 5MB';
				return;
			}

			if (!file.type.startsWith('image/')) {
				fileError = 'Please select an image file';
				return;
			}

			selectedFile = file;
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
			previewUrl = URL.createObjectURL(file);
		}
	}

	function clearFile() {
		if ($submitting) return;
		selectedFile = null;
		fileError = null;
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function needsProfileData() {
		return $form.accountType === 'business' || $form.accountType === 'charity';
	}

	function canSubmit() {
		const paymentMethod = 'paymentMethod' in $form ? $form.paymentMethod : undefined;
		const ibanNumber = 'ibanNumber' in $form ? $form.ibanNumber : undefined;
		const tetherAddress = 'tetherAddress' in $form ? $form.tetherAddress : undefined;

		// For businesses and charities, require at least one payment method
		const hasPaymentMethod =
			paymentMethod &&
			((paymentMethod === 'iban' && ibanNumber) ||
				(paymentMethod === 'tether' && tetherAddress));

		if ($form.accountType === 'business') {
			const name = 'name' in $form ? $form.name : '';
			const description = 'description' in $form ? $form.description : '';
			const country = 'country' in $form ? $form.country : '';
			const businessType = 'businessType' in $form ? $form.businessType : undefined;
			return !!(
				name &&
				description &&
				country &&
				businessType &&
				selectedFile &&
				!fileError &&
				hasPaymentMethod
			);
		} else if ($form.accountType === 'charity') {
			const name = 'name' in $form ? $form.name : '';
			const description = 'description' in $form ? $form.description : '';
			const country = 'country' in $form ? $form.country : '';
			return !!(name && description && country && selectedFile && !fileError && hasPaymentMethod);
		}
		// Users don't require payment method
		return true;
	}

	function getFormValue(field: string): string {
		const value = $form[field as keyof typeof $form];
		return typeof value === 'string' ? value : '';
	}

	function getFormError(field: string): string[] | undefined {
		return $errors[field as keyof typeof $errors];
	}

	$effect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});
</script>

{#if step === 1}
	<div class="space-y-6">
		<div class="justify-center text-center">
			<FluentEmojiFlatBentoBox class="size-7" />
			<h1 class="mb-2 text-lg font-bold">Welcome to Go Bento!</h1>
			<p class="text-base-content/70">Join the fight against food waste and help save our planet</p>
		</div>

		<div class="card bg-base-200">
			<div class="card-body">
				<h2 class="mb-1 text-lg font-semibold">Choose your account type</h2>
				<p class="mb-4 text-sm text-base-content/60">
					Select how you'd like to participate in reducing food waste
				</p>
				<div class="space-y-3">
					{#each accountTypes as type}
						<button
							type="button"
							class="group flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all"
							class:border-primary={$form.accountType === type.id}
							class:bg-primary-5={$form.accountType === type.id}
							class:border-base-300={$form.accountType !== type.id}
							class:hover:border-primary-50={$form.accountType !== type.id}
							class:hover:bg-base-200={$form.accountType !== type.id}
							onclick={() => selectType(type.id)}
						>
							<div
								class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
							>
								<type.icon class="h-6 w-6" />
							</div>
							<div class="flex-1">
								<h3 class="font-semibold">{type.title}</h3>
								<p class="text-sm text-base-content/60">{type.description}</p>
							</div>
							{#if $form.accountType === type.id}
								<div
									class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content"
								>
									<IconCheckmark class="h-4 w-4" />
								</div>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		</div>

		{#if $form.accountType}
			<div class="flex justify-end">
				<button type="button" class="btn gap-2 btn-primary" onclick={handleContinue}>
					Continue
					<IconArrowRight class="size-5" />
				</button>
			</div>
		{/if}
	</div>
{:else if step === 2}
	<div class="space-y-6">
		<div class="text-center">
			<div
				class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-content"
			>
				<IconCheckCircle class="size-7" />
			</div>
			<h1 class="mb-2 text-lg font-bold">
				{needsProfileData() ? 'Tell us about yourself' : 'Complete Your Setup'}
			</h1>
			<p class="text-base-content/70">
				{needsProfileData()
					? 'Help users discover and trust your food-saving offerings'
					: 'Set up your account preferences'}
			</p>
		</div>

		<form
			method="POST"
			action="?/setup"
			enctype="multipart/form-data"
			class="card bg-base-200"
			use:enhance
		>
			<div class="card-body">
				<input type="hidden" name="accountType" value={$form.accountType} />

				{#if $message}
					<div class="alert alert-error">
						<IconErrorCircle class="size-5" />
						<span>{$message}</span>
					</div>
				{/if}

				{#if needsProfileData()}
					<div class="space-y-4">
						<!-- Name -->
						<div class="form-control">
							<label class="label" for="name">
								<span class="label-text font-medium">
									{$form.accountType === 'business' ? 'Business Name' : 'Organization Name'}
								</span>
								<span class="label-text-alt text-error">Required</span>
							</label>
							<input
								id="name"
								name="name"
								type="text"
								placeholder={$form.accountType === 'business'
									? 'e.g., Fresh Bakery & Café'
									: 'e.g., Community Food Bank'}
								class="input-bordered input w-full"
								class:input-error={getFormError('name')}
								value={getFormValue('name')}
								oninput={(e) => {
									if ('name' in $form) {
										$form.name = e.currentTarget.value;
									}
								}}
								disabled={$submitting}
							/>
							{#if getFormError('name')}
								<label class="label">
									<span class="label-text-alt flex items-center gap-1 text-error">
										<IconWarning class="size-3" />
										{getFormError('name')}
									</span>
								</label>
							{/if}
						</div>

						{#if $form.accountType === 'business'}
							<div class="form-control">
								<label class="label" for="businessType">
									<span class="label-text font-medium">Business Type</span>
									<span class="label-text-alt text-error">Required</span>
								</label>
								<select
									id="businessType"
									name="businessType"
									class="select-bordered select w-full"
									class:select-error={getFormError('businessType')}
									value={getFormValue('businessType')}
									onchange={(e) => {
										if ('businessType' in $form) {
											$form.businessType = e.currentTarget.value as any;
										}
									}}
									disabled={$submitting}
								>
									<option value="" disabled selected>Select your business type</option>
									{#each businessTypes as type}
										<option value={type.value}>{type.label}</option>
									{/each}
								</select>
								{#if getFormError('businessType')}
									<label class="label">
										<span class="label-text-alt flex items-center gap-1 text-error">
											<IconWarning class="size-3" />
											{getFormError('businessType')}
										</span>
									</label>
								{/if}
							</div>
						{/if}

						<!-- Description -->
						<div class="form-control">
							<label class="label" for="description">
								<span class="label-text font-medium">Description</span>
								<span class="label-text-alt text-error">Required</span>
							</label>
							<textarea
								id="description"
								name="description"
								placeholder={$form.accountType === 'business'
									? 'Describe what surplus food you offer (e.g., fresh baked goods, prepared meals, groceries)...'
									: 'Describe your mission and how you help the community...'}
								class="textarea-bordered textarea w-full"
								class:textarea-error={getFormError('description')}
								rows="4"
								value={getFormValue('description')}
								oninput={(e) => {
									if ('description' in $form) {
										$form.description = e.currentTarget.value;
									}
								}}
								disabled={$submitting}
							></textarea>
							{#if getFormError('description')}
								<label class="label">
									<span class="label-text-alt flex items-center gap-1 text-error">
										<IconWarning class="size-3" />
										{getFormError('description')}
									</span>
								</label>
							{:else}
								<label class="label">
									<span class="label-text-alt text-base-content/50">
										{getFormValue('description').length}/500 characters
									</span>
								</label>
							{/if}
						</div>

						<!-- Country with Custom Select -->
						<div class="form-control">
							<label class="label" for="country">
								<span class="label-text font-medium">Country</span>
								<span class="label-text-alt text-error">Required</span>
							</label>
							<CountrySelect
								{countries}
								bind:value={$form.country}
								error={!!getFormError('country')}
								disabled={$submitting}
								onchange={(value) => {
									if ('country' in $form) {
										$form.country = value;
									}
								}}
							/>
							{#if getFormError('country')}
								<label class="label">
									<span class="label-text-alt flex items-center gap-1 text-error">
										<IconWarning class="size-3" />
										{getFormError('country')}
									</span>
								</label>
							{/if}
						</div>

						<!-- File Upload -->
						<div class="form-control">
							<label class="label" for="picture">
								<span class="label-text font-medium">Profile Picture</span>
								<span class="label-text-alt text-error">Required</span>
							</label>
							<input
								bind:this={fileInput}
								id="picture"
								name="picture"
								type="file"
								accept="image/*"
								class="hidden"
								onchange={handleFileSelect}
								disabled={$submitting}
							/>
							<button
								type="button"
								onclick={() => fileInput?.click()}
								disabled={$submitting}
								class="relative w-full overflow-hidden rounded-xl border-2 border-dashed transition-all"
								class:border-base-300={!selectedFile && !fileError}
								class:border-success={selectedFile && !fileError}
								class:bg-success-5={selectedFile && !fileError}
								class:border-error={fileError}
								class:bg-error-5={fileError}
								class:hover:border-primary={!$submitting && !selectedFile && !fileError}
								class:hover:bg-base-200={!$submitting && !selectedFile && !fileError}
								class:opacity-50={$submitting}
							>
								{#if !selectedFile}
									<div class="flex min-h-[140px] flex-col items-center justify-center gap-3 p-6">
										<div class="rounded-xl bg-base-200 p-3">
											<IconImage class="h-8 w-8 text-base-content/40" />
										</div>
										<div class="text-center">
											<p class="font-medium text-base-content">Choose an image</p>
											<p class="mt-1 text-sm text-base-content/60">PNG, JPG, GIF up to 5MB</p>
										</div>
									</div>
								{:else}
									<div class="flex gap-4 p-4">
										<div class="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
											<img src={previewUrl} alt="Preview" class="h-full w-full object-cover" />
										</div>
										<div class="flex min-w-0 flex-1 flex-col justify-center text-left">
											<p class="truncate font-medium" title={selectedFile.name}>
												{selectedFile.name}
											</p>
											<p class="text-sm text-base-content/60">
												{Math.round(selectedFile.size / 1024)} KB
											</p>
											<div class="mt-1 flex items-center gap-1 text-success">
												<IconCheckmark class="h-4 w-4" />
												<span class="text-xs font-medium">Ready to upload</span>
											</div>
										</div>
									</div>
								{/if}
							</button>
							{#if fileError}
								<label class="label">
									<span class="label-text-alt flex items-center gap-1 text-error">
										<IconWarning class="size-3" />
										{fileError}
									</span>
								</label>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Payment Configuration (required for businesses/charities) -->
				{#if needsProfileData()}
					<div class="space-y-4">
						<div class="divider">Payment Information</div>
						
						<!-- Payment Method Selection -->
						<div class="form-control">
							<label class="label" for="paymentMethod">
								<span class="label-text font-medium">Payment Method</span>
								<span class="label-text-alt text-error">Required</span>
							</label>
							<select
								id="paymentMethod"
								name="paymentMethod"
								class="select-bordered select w-full"
								class:select-error={getFormError('paymentMethod')}
								value={getFormValue('paymentMethod')}
								onchange={(e) => {
									if ('paymentMethod' in $form) {
										$form.paymentMethod = e.currentTarget.value as any;
									}
									if ('ibanNumber' in $form) {
										$form.ibanNumber = undefined;
									}
									if ('tetherAddress' in $form) {
										$form.tetherAddress = undefined;
									}
								}}
								disabled={$submitting}
							>
								<option value="" disabled selected>Select payment method</option>
								<option value="iban">🏦 IBAN (Bank Transfer)</option>
								<option value="tether">₮ Tether (USDT)</option>
							</select>
							{#if getFormError('paymentMethod')}
								<label class="label">
									<span class="label-text-alt flex items-center gap-1 text-error">
										<IconWarning class="size-3" />
										{getFormError('paymentMethod')}
									</span>
								</label>
							{/if}
						</div>

						<!-- IBAN Number -->
						{#if getFormValue('paymentMethod') === 'iban'}
							<div class="form-control">
								<label class="label" for="ibanNumber">
									<span class="label-text font-medium">IBAN Number</span>
									<span class="label-text-alt text-error">Required</span>
								</label>
								<input
									id="ibanNumber"
									name="ibanNumber"
									type="text"
									placeholder="DE89 3704 0044 0532 0130 00"
									class="input-bordered input w-full font-mono"
									class:input-error={getFormError('ibanNumber')}
									value={getFormValue('ibanNumber')}
									oninput={(e) => {
										if ('ibanNumber' in $form) {
											$form.ibanNumber = e.currentTarget.value;
										}
									}}
									disabled={$submitting}
								/>
								{#if getFormError('ibanNumber')}
									<label class="label">
										<span class="label-text-alt flex items-center gap-1 text-error">
											<IconWarning class="size-3" />
											{getFormError('ibanNumber')}
										</span>
									</label>
								{:else}
									<label class="label">
										<span class="label-text-alt text-base-content/50">
											International Bank Account Number for receiving payments
										</span>
									</label>
								{/if}
							</div>
						{/if}

						<!-- Tether Address -->
						{#if getFormValue('paymentMethod') === 'tether'}
							<div class="form-control">
								<label class="label" for="tetherAddress">
									<span class="label-text font-medium">Tether (USDT) Wallet Address</span>
									<span class="label-text-alt text-error">Required</span>
								</label>
								<input
									id="tetherAddress"
									name="tetherAddress"
									type="text"
									placeholder="0x..."
									class="input-bordered input w-full font-mono"
									class:input-error={getFormError('tetherAddress')}
									value={getFormValue('tetherAddress')}
									oninput={(e) => {
										if ('tetherAddress' in $form) {
											$form.tetherAddress = e.currentTarget.value;
										}
									}}
									disabled={$submitting}
								/>
								{#if getFormError('tetherAddress')}
									<label class="label">
										<span class="label-text-alt flex items-center gap-1 text-error">
											<IconWarning class="size-3" />
											{getFormError('tetherAddress')}
										</span>
									</label>
								{:else}
									<label class="label">
										<span class="label-text-alt text-base-content/50">
											ERC-20 USDT address on Ethereum network
										</span>
									</label>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Navigation -->
			<div class="card-body border-t border-base-300 bg-base-200/50 pt-4">
				<div class="flex items-center justify-between gap-4">
					<button
						type="button"
						class="btn gap-2 btn-ghost"
						onclick={handleBack}
						disabled={$submitting}
					>
						<IconArrowLeft class="size-5" />
						Back
					</button>
					<button
						type="submit"
						class="btn gap-2 btn-primary"
						disabled={!canSubmit() || $submitting}
					>
						{#if $submitting}
							<span class="loading loading-sm loading-spinner"></span>
							Setting up...
						{:else}
							<IconCloudArrowUp class="size-5" />
							Complete Setup
						{/if}
					</button>
				</div>
			</div>
		</form>
	</div>
{/if}