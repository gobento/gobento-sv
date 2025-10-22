<!-- src/routes/welcome/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import * as v from 'valibot';
	import IconBriefcase from '~icons/fluent/briefcase-24-regular';
	import IconPerson from '~icons/fluent/person-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
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

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Validation schemas (must match server)
	const userSetupSchema = v.object({
		accountType: v.literal('user')
	});

	const businessSetupSchema = v.object({
		accountType: v.literal('business'),
		name: v.pipe(
			v.string(),
			v.minLength(1, 'Name is required'),
			v.maxLength(100, 'Name must be less than 100 characters')
		),
		description: v.pipe(
			v.string(),
			v.minLength(1, 'Description is required'),
			v.maxLength(500, 'Description must be less than 500 characters')
		),
		country: v.pipe(v.string(), v.minLength(1, 'Country is required'))
	});

	const charitySetupSchema = v.object({
		accountType: v.literal('charity'),
		name: v.pipe(
			v.string(),
			v.minLength(1, 'Name is required'),
			v.maxLength(100, 'Name must be less than 100 characters')
		),
		description: v.pipe(
			v.string(),
			v.minLength(1, 'Description is required'),
			v.maxLength(500, 'Description must be less than 500 characters')
		),
		country: v.pipe(v.string(), v.minLength(1, 'Country is required'))
	});

	const setupSchema = v.variant('accountType', [
		userSetupSchema,
		businessSetupSchema,
		charitySetupSchema
	]);

	const { form, errors, enhance, submitting, delayed, message } = superForm(data.form, {
		validators: valibotClient(setupSchema),
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

	let step = $state<number>(1);
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let fileError = $state<string | null>(null);

	function selectType(id: 'user' | 'business' | 'charity') {
		$form.accountType = id;
		// Reset form fields when switching types
		if (id === 'user') {
			$form.name = '';
			$form.description = '';
			$form.country = '';
		}
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

			// Validate file size (5MB max)
			if (file.size > 5 * 1024 * 1024) {
				fileError = 'File size must be less than 5MB';
				return;
			}

			// Validate file type
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
		if (needsProfileData()) {
			return $form.name && $form.description && $form.country && selectedFile && !fileError;
		}
		return true; // User accounts don't need additional data
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});
</script>

<div class="min-h-screen bg-base-200">
	<div class="flex min-h-screen items-center justify-center px-4 py-12">
		<div class="w-full max-w-lg">
			{#if step === 1}
				<div class="space-y-6">
					<!-- Header -->
					<div class="text-center">
						<div
							class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-content"
						>
							<IconCheckCircle class="h-7 w-7" />
						</div>
						<h1 class="mb-2 text-3xl font-bold">Welcome to FoodSaver!</h1>
						<p class="text-base-content/70">
							Join the fight against food waste and help save our planet
						</p>
					</div>

					<!-- Account Type Cards -->
					<div class="card bg-base-100 shadow-lg">
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
										<!-- Icon -->
										<div
											class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
										>
											<type.icon class="h-6 w-6" />
										</div>

										<!-- Text content -->
										<div class="flex-1">
											<h3 class="font-semibold">{type.title}</h3>
											<p class="text-sm text-base-content/60">{type.description}</p>
										</div>

										<!-- Selected indicator -->
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

					<!-- Continue Button -->
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
					<!-- Header -->
					<div class="text-center">
						<div
							class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-content"
						>
							{#if needsProfileData()}
								<svelte:component
									this={accountTypes.find((t) => t.id === $form.accountType)?.icon}
									class="h-7 w-7"
								/>
							{:else}
								<IconCheckCircle class="h-7 w-7" />
							{/if}
						</div>
						<h1 class="mb-2 text-3xl font-bold">
							{needsProfileData() ? 'Tell us about yourself' : 'All Set!'}
						</h1>
						<p class="text-base-content/70">
							{needsProfileData()
								? 'Help users discover and trust your food-saving offerings'
								: 'Start saving food and money today!'}
						</p>
					</div>

					<!-- Form -->
					<form
						method="POST"
						action="?/setup"
						enctype="multipart/form-data"
						class="card bg-base-100 shadow-lg"
						use:enhance
					>
						<div class="card-body">
							<input type="hidden" name="accountType" value={$form.accountType} />

							<!-- Global Error Message -->
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
											class:input-error={$errors.name}
											bind:value={$form.name}
											disabled={$submitting}
										/>
										{#if $errors.name}
											<label class="label">
												<span class="label-text-alt flex items-center gap-1 text-error">
													<IconWarning class="h-3 w-3" />
													{$errors.name}
												</span>
											</label>
										{/if}
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
											placeholder={$form.accountType === 'business'
												? 'Describe what surplus food you offer (e.g., fresh baked goods, prepared meals, groceries)...'
												: 'Describe your mission and how you help the community...'}
											class="textarea-bordered textarea w-full"
											class:textarea-error={$errors.description}
											rows="4"
											bind:value={$form.description}
											disabled={$submitting}
										></textarea>
										{#if $errors.description}
											<label class="label">
												<span class="label-text-alt flex items-center gap-1 text-error">
													<IconWarning class="h-3 w-3" />
													{$errors.description}
												</span>
											</label>
										{:else}
											<label class="label">
												<span class="label-text-alt text-base-content/50">
													{$form.description?.length || 0}/500 characters
												</span>
											</label>
										{/if}
									</div>

									<!-- Country Select -->
									<div class="form-control">
										<label class="label" for="country">
											<span class="label-text font-medium">Country</span>
											<span class="label-text-alt text-error">Required</span>
										</label>
										<select
											id="country"
											name="country"
											class="select-bordered select w-full"
											class:select-error={$errors.country}
											bind:value={$form.country}
											disabled={$submitting}
										>
											<option value="" disabled selected>Select your country</option>
											{#each countries as country}
												<option value={country.code}>
													{country.name}
												</option>
											{/each}
										</select>
										{#if $errors.country}
											<label class="label">
												<span class="label-text-alt flex items-center gap-1 text-error">
													<IconWarning class="h-3 w-3" />
													{$errors.country}
												</span>
											</label>
										{/if}
										{#if $form.country}
											<div class="mt-2 flex items-center gap-2">
												<svelte:component
													this={countries.find((c) => c.code === $form.country)?.flag}
													class="h-8 w-8"
												/>
												<span class="text-sm text-base-content/70">
													{countries.find((c) => c.code === $form.country)?.name}
												</span>
											</div>
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
												<div
													class="flex min-h-[140px] flex-col items-center justify-center gap-3 p-6"
												>
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
														<img
															src={previewUrl}
															alt="Preview"
															class="h-full w-full object-cover"
														/>
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
													<IconWarning class="h-3 w-3" />
													{fileError}
												</span>
											</label>
										{/if}
									</div>
								</div>
							{:else}
								<div class="py-8 text-center">
									<div
										class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 text-success"
									>
										<IconCheckCircle class="h-8 w-8" />
									</div>
									<p class="mb-2 font-semibold text-base-content">You're ready to start saving!</p>
									<p class="text-sm text-base-content/60">
										Browse nearby businesses offering surplus food at great prices.
									</p>
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
										{needsProfileData() ? 'Complete Setup' : 'Start Saving Food'}
									{/if}
								</button>
							</div>
						</div>
					</form>
				</div>
			{/if}
		</div>
	</div>
</div>
