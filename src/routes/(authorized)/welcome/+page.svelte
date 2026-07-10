<!-- src/routes/welcome/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import IconBriefcase from '~icons/fluent/briefcase-24-regular';
	import IconBriefcaseFilled from '~icons/fluent/briefcase-24-filled';
	import IconPerson from '~icons/fluent/person-24-regular';
	import IconPersonFilled from '~icons/fluent/person-24-filled';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconHeartFilled from '~icons/fluent/heart-24-filled';
	import FluentEmojiFlatBentoBox from '~icons/fluent-emoji-flat/bento-box';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconImage from '~icons/fluent/image-24-regular';
	import IconCloudArrowUp from '~icons/fluent/cloud-arrow-up-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-24-regular';
	import IconErrorCircle from '~icons/fluent/error-circle-24-filled';
	import IconWarning from '~icons/fluent/warning-24-filled';
	import FlagGermany from '~icons/circle-flags/de';
	import FlagIran from '~icons/circle-flags/ir';
	import IconShieldTask from '~icons/fluent/shield-task-24-regular';
	import IconMail from '~icons/fluent/mail-24-regular';
	import IconDocument from '~icons/fluent/document-24-regular';
	import { fly } from 'svelte/transition';
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
		iconFilled: any;
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

	const highlights = [
		{
			emoji: '🌍',
			title: 'Reduce food waste',
			description: 'Rescue surplus food before it ends up in the bin'
		},
		{
			emoji: '💰',
			title: 'Save money',
			description: 'Enjoy great food at a fraction of the price'
		},
		{
			emoji: '🤝',
			title: 'Help your community',
			description: 'Support local businesses and people in need'
		}
	];

	let accountTypes: AccountType[] = [
		{
			id: 'business',
			title: 'Business',
			description: 'Sell surplus food at discounted prices',
			icon: IconBriefcase,
			iconFilled: IconBriefcaseFilled
		},
		{
			id: 'user',
			title: 'Personal',
			description: 'Save money and help reduce food waste',
			icon: IconPerson,
			iconFilled: IconPersonFilled
		},
		{
			id: 'charity',
			title: 'Charity',
			description: 'Receive donated food for those in need',
			icon: IconHeart,
			iconFilled: IconHeartFilled
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

	type StepId = 'intro' | 'account' | 'profile' | 'verification' | 'payment';

	let currentStep = $state<StepId>('intro');
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let fileError = $state<string | null>(null);

	const needsProfile = $derived(
		$form.accountType === 'business' || $form.accountType === 'charity'
	);

	// Charities are manually reviewed by Go Bento staff before going live.
	const needsVerification = $derived($form.accountType === 'charity');

	// The steps shown in the progress indicator (intro is not counted).
	const flowSteps = $derived([
		{ id: 'account' as const, label: 'Account' },
		...(needsProfile ? [{ id: 'profile' as const, label: 'Profile' }] : []),
		...(needsVerification ? [{ id: 'verification' as const, label: 'Verification' }] : []),
		{ id: 'payment' as const, label: 'Payment' }
	]);

	const currentFlowIndex = $derived(flowSteps.findIndex((s) => s.id === currentStep));

	const stepTitle = $derived(
		currentStep === 'profile'
			? 'Tell us about yourself'
			: currentStep === 'verification'
				? 'Verify your charity'
				: currentStep === 'payment'
					? 'Payment setup'
					: ''
	);

	const stepSubtitle = $derived(
		currentStep === 'profile'
			? 'Help people discover and trust your food-saving offerings'
			: currentStep === 'verification'
				? 'Our team reviews every charity before it goes live'
				: currentStep === 'payment'
					? needsProfile
						? "Add where you'd like to receive payments"
						: 'Set up your payment method to complete purchases securely'
					: ''
	);

	function selectType(id: 'user' | 'business' | 'charity') {
		$form.accountType = id;
		// Reset form fields when switching types
		if ('name' in $form) $form.name = '';
		if ('description' in $form) $form.description = '';
		if ('country' in $form) $form.country = '';
		if ('registrationNumber' in $form) $form.registrationNumber = '';
		if ('contactEmail' in $form) $form.contactEmail = '';
		if ('businessType' in $form) $form.businessType = undefined;
		if ('paymentMethod' in $form) $form.paymentMethod = undefined;
		if ('ibanNumber' in $form) $form.ibanNumber = undefined;
		if ('tetherAddress' in $form) $form.tetherAddress = undefined;
	}

	function handleGetStarted() {
		currentStep = 'account';
	}

	function goNext() {
		if (currentStep === 'account') {
			currentStep = needsProfile ? 'profile' : 'payment';
		} else if (currentStep === 'profile') {
			currentStep = needsVerification ? 'verification' : 'payment';
		} else if (currentStep === 'verification') {
			currentStep = 'payment';
		}
	}

	function goBack() {
		fileError = null;
		if (currentStep === 'payment') {
			currentStep = needsVerification ? 'verification' : needsProfile ? 'profile' : 'account';
		} else if (currentStep === 'verification') {
			currentStep = 'profile';
		} else if (currentStep === 'profile') {
			currentStep = 'account';
		} else if (currentStep === 'account') {
			currentStep = 'intro';
		}
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

	function canProceedProfile() {
		if (!needsProfile) return true;

		const name = 'name' in $form ? $form.name : '';
		const description = 'description' in $form ? $form.description : '';
		const country = 'country' in $form ? $form.country : '';

		if ($form.accountType === 'business') {
			const businessType = 'businessType' in $form ? $form.businessType : undefined;
			return !!(name && description && country && businessType && selectedFile && !fileError);
		}

		return !!(name && description && country && selectedFile && !fileError);
	}

	function canProceedVerification() {
		if (!needsVerification) return true;

		const registrationNumber = 'registrationNumber' in $form ? $form.registrationNumber : '';
		const contactEmail = 'contactEmail' in $form ? $form.contactEmail : '';
		return !!(registrationNumber && contactEmail && !getFormError('contactEmail'));
	}

	function canSubmit() {
		const paymentMethod = 'paymentMethod' in $form ? $form.paymentMethod : undefined;
		const ibanNumber = 'ibanNumber' in $form ? $form.ibanNumber : undefined;
		const tetherAddress = 'tetherAddress' in $form ? $form.tetherAddress : undefined;

		// All account types require payment method
		const hasPaymentMethod =
			paymentMethod &&
			((paymentMethod === 'iban' && ibanNumber) || (paymentMethod === 'tether' && tetherAddress));

		if (!hasPaymentMethod) {
			return false;
		}

		if ($form.accountType === 'business') {
			const name = 'name' in $form ? $form.name : '';
			const description = 'description' in $form ? $form.description : '';
			const country = 'country' in $form ? $form.country : '';
			const businessType = 'businessType' in $form ? $form.businessType : undefined;
			return !!(name && description && country && businessType && selectedFile && !fileError);
		} else if ($form.accountType === 'charity') {
			const name = 'name' in $form ? $form.name : '';
			const description = 'description' in $form ? $form.description : '';
			const country = 'country' in $form ? $form.country : '';
			const registrationNumber = 'registrationNumber' in $form ? $form.registrationNumber : '';
			const contactEmail = 'contactEmail' in $form ? $form.contactEmail : '';
			return !!(
				name &&
				description &&
				country &&
				registrationNumber &&
				contactEmail &&
				selectedFile &&
				!fileError
			);
		}

		// Users just need payment method
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

<div class="space-y-6">
	<!-- Progress stepper -->
	{#if currentStep !== 'intro'}
		<div class="flex items-center justify-center">
			{#each flowSteps as s, i (s.id)}
				<div class="flex items-center gap-2">
					<div
						class={`flex size-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
							i < currentFlowIndex
								? 'border-primary bg-primary text-primary-content'
								: i === currentFlowIndex
									? 'border-primary text-primary'
									: 'border-base-300 text-base-content/40'
						}`}
					>
						{#if i < currentFlowIndex}
							<IconCheckmark class="size-4" />
						{:else}
							{i + 1}
						{/if}
					</div>
					<span
						class={`hidden text-sm font-medium transition-all sm:inline ${
							i <= currentFlowIndex ? 'text-base-content' : 'text-base-content/40'
						}`}
					>
						{s.label}
					</span>
				</div>
				{#if i < flowSteps.length - 1}
					<div
						class={`mx-2 h-0.5 w-8 rounded-full transition-all sm:w-12 ${
							i < currentFlowIndex ? 'bg-primary' : 'bg-base-300'
						}`}
					></div>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Onboarding intro -->
	{#if currentStep === 'intro'}
		<div class="space-y-6" in:fly={{ y: 12, duration: 250 }}>
			<div class="flex flex-col items-center text-center">
				<div class="mb-4 flex size-20 items-center justify-center rounded-3xl bg-primary/10">
					<FluentEmojiFlatBentoBox class="size-12" />
				</div>
				<h1 class="text-2xl font-bold">Welcome to Go Bento!</h1>
				<p class="mt-2 text-base-content/70">
					Join the fight against food waste and help save our planet — one bento at a time.
				</p>
			</div>

			<div class="space-y-3">
				{#each highlights as h (h.title)}
					<div class="card bg-base-200">
						<div class="card-body flex-row items-center gap-4 p-4">
							<div
								class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-base-100 text-2xl"
							>
								{h.emoji}
							</div>
							<div>
								<h3 class="font-semibold">{h.title}</h3>
								<p class="text-sm text-base-content/60">{h.description}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<button type="button" class="btn gap-2 btn-block btn-primary" onclick={handleGetStarted}>
				Get Started
				<IconArrowRight class="size-5" />
			</button>
		</div>

		<!-- Step 1: Account type -->
	{:else if currentStep === 'account'}
		<div class="space-y-6" in:fly={{ y: 12, duration: 250 }}>
			<div class="text-center">
				<h1 class="mb-2 text-lg font-bold">Choose your account type</h1>
				<p class="text-base-content/70">
					Select how you'd like to participate in reducing food waste
				</p>
			</div>

			<div class="space-y-3">
				{#each accountTypes as type (type.id)}
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
						{#if $form.accountType === type.id}
							<div
								class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-content"
							>
								<type.iconFilled class="size-6" />
							</div>
						{:else}
							<div class="flex size-12 shrink-0 items-center justify-center text-base-content/60">
								<type.icon class="size-6" />
							</div>
						{/if}
						<div class="flex-1">
							<h3 class="font-semibold">{type.title}</h3>
							<p class="text-sm text-base-content/60">{type.description}</p>
						</div>
						{#if $form.accountType === type.id}
							<div
								class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content"
							>
								<IconCheckmark class="size-4" />
							</div>
						{/if}
					</button>
				{/each}
			</div>

			<div class="flex items-center justify-between gap-4">
				<button type="button" class="btn gap-2 btn-ghost" onclick={goBack}>
					<IconArrowLeft class="size-5" />
					Back
				</button>
				<button
					type="button"
					class="btn gap-2 btn-primary"
					disabled={!$form.accountType}
					onclick={goNext}
				>
					Continue
					<IconArrowRight class="size-5" />
				</button>
			</div>
		</div>

		<!-- Step 2/3: Profile + Payment form -->
	{:else}
		<div class="space-y-6" in:fly={{ y: 12, duration: 250 }}>
			<div class="text-center">
				<h1 class="mb-2 text-lg font-bold">{stepTitle}</h1>
				<p class="text-base-content/70">{stepSubtitle}</p>
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

					<!-- Profile section (business/charity only) -->
					{#if needsProfile}
						<div class="space-y-4" class:hidden={currentStep !== 'profile'}>
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
									disabled={$submitting}></textarea>
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

							<!-- Country with Native Select -->
							<div class="form-control">
								<label class="label" for="country">
									<span class="label-text font-medium">Country</span>
									<span class="label-text-alt text-error">Required</span>
								</label>
								<select
									id="country"
									name="country"
									class="select-bordered select w-full"
									class:select-error={getFormError('country')}
									value={getFormValue('country')}
									onchange={(e) => {
										if ('country' in $form) {
											$form.country = e.currentTarget.value;
										}
									}}
									disabled={$submitting}
								>
									<option value="" disabled selected>Select your country</option>
									{#each countries as country}
										<option value={country.code}>{country.name}</option>
									{/each}
								</select>
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
											<div class="size-20 shrink-0 overflow-hidden rounded-lg">
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
													<IconCheckmark class="size-4" />
													<span class="text-xs font-medium">Ready to upload</span>
												</div>
											</div>
										</div>
									{/if}
								</button>
								{#if selectedFile && !$submitting}
									<button type="button" class="btn mt-2 btn-ghost btn-xs" onclick={clearFile}>
										Remove image
									</button>
								{/if}
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

					<!-- Verification section (charity only) -->
					{#if needsVerification}
						<div class="space-y-4" class:hidden={currentStep !== 'verification'}>
							<!-- Explanation of the manual review by Go Bento staff -->
							<div class="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
								<div
									class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
								>
									<IconShieldTask class="size-5" />
								</div>
								<div class="space-y-1 text-sm">
									<p class="font-semibold">Manual verification by Go Bento</p>
									<p class="text-base-content/70">
										To keep our community safe, our staff manually reviews every charity. We'll
										check the details below and get in touch once your organization is verified —
										you can finish setting up your account in the meantime.
									</p>
								</div>
							</div>

							<!-- Registration / charity number -->
							<div class="form-control">
								<label class="label" for="registrationNumber">
									<span class="label-text font-medium">Charity Registration Number</span>
									<span class="label-text-alt text-error">Required</span>
								</label>
								<label
									class="input-bordered input flex w-full items-center gap-2"
									class:input-error={getFormError('registrationNumber')}
								>
									<IconDocument class="size-5 shrink-0 text-base-content/40" />
									<input
										id="registrationNumber"
										name="registrationNumber"
										type="text"
										placeholder="e.g., CHY 12345"
										class="grow bg-transparent"
										value={getFormValue('registrationNumber')}
										oninput={(e) => {
											if ('registrationNumber' in $form) {
												$form.registrationNumber = e.currentTarget.value;
											}
										}}
										disabled={$submitting}
									/>
								</label>
								{#if getFormError('registrationNumber')}
									<label class="label">
										<span class="label-text-alt flex items-center gap-1 text-error">
											<IconWarning class="size-3" />
											{getFormError('registrationNumber')}
										</span>
									</label>
								{:else}
									<label class="label">
										<span class="label-text-alt text-base-content/50">
											The official number from your charity registry
										</span>
									</label>
								{/if}
							</div>

							<!-- Verification contact email -->
							<div class="form-control">
								<label class="label" for="contactEmail">
									<span class="label-text font-medium">Verification Contact Email</span>
									<span class="label-text-alt text-error">Required</span>
								</label>
								<label
									class="input-bordered input flex w-full items-center gap-2"
									class:input-error={getFormError('contactEmail')}
								>
									<IconMail class="size-5 shrink-0 text-base-content/40" />
									<input
										id="contactEmail"
										name="contactEmail"
										type="email"
										placeholder="verification@yourcharity.org"
										class="grow bg-transparent"
										value={getFormValue('contactEmail')}
										oninput={(e) => {
											if ('contactEmail' in $form) {
												$form.contactEmail = e.currentTarget.value;
											}
										}}
										disabled={$submitting}
									/>
								</label>
								{#if getFormError('contactEmail')}
									<label class="label">
										<span class="label-text-alt flex items-center gap-1 text-error">
											<IconWarning class="size-3" />
											{getFormError('contactEmail')}
										</span>
									</label>
								{:else}
									<label class="label">
										<span class="label-text-alt text-base-content/50">
											Where our team can reach you about your verification
										</span>
									</label>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Payment section (all account types) -->
					<div class="space-y-4" class:hidden={currentStep !== 'payment'}>
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
											International Bank Account Number for {needsProfile ? 'receiving' : 'making'} payments
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
				</div>

				<!-- Navigation -->
				<div class="card-body border-t border-base-300 bg-base-200/50 pt-4">
					<div class="flex items-center justify-between gap-4">
						<button
							type="button"
							class="btn gap-2 btn-ghost"
							onclick={goBack}
							disabled={$submitting}
						>
							<IconArrowLeft class="size-5" />
							Back
						</button>
						{#if currentStep === 'payment'}
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
						{:else}
							<button
								type="button"
								class="btn gap-2 btn-primary"
								disabled={currentStep === 'verification'
									? !canProceedVerification()
									: !canProceedProfile()}
								onclick={goNext}
							>
								Continue
								<IconArrowRight class="size-5" />
							</button>
						{/if}
					</div>
				</div>
			</form>
		</div>
	{/if}
</div>
