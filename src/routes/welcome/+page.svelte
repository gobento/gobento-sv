<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import IconBriefcase from '~icons/fluent/briefcase-24-regular';
	import IconPerson from '~icons/fluent/person-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconArrowRight from '~icons/fluent/arrow-right-24-regular';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconImage from '~icons/fluent/image-24-regular';
	import IconCloudArrowUp from '~icons/fluent/cloud-arrow-up-24-regular';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	interface AccountType {
		id: string;
		title: string;
		description: string;
		icon: any;
	}

	let accountTypes: AccountType[] = [
		{
			id: 'business',
			title: 'Business',
			description: 'For companies and organizations',
			icon: IconBriefcase
		},
		{
			id: 'user',
			title: 'Personal',
			description: 'For individual use',
			icon: IconPerson
		},
		{
			id: 'charity',
			title: 'Charity',
			description: 'For non-profit organizations',
			icon: IconHeart
		}
	];

	let step = $state<number>(1);
	let selectedType = $state<string | null>(null);
	let uploading = $state<boolean>(false);
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let fileInput: HTMLInputElement;

	// Form data
	let formData = $state({
		name: '',
		description: ''
	});

	function selectType(id: string) {
		selectedType = id;
	}

	function handleContinue() {
		if (selectedType !== null) {
			step = 2;
		}
	}

	function handleBack() {
		step = 1;
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			// Validate file size (5MB max)
			if (file.size > 5 * 1024 * 1024) {
				alert('File size must be less than 5MB');
				return;
			}

			// Validate file type
			if (!file.type.startsWith('image/')) {
				alert('Please select an image file');
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
		if (uploading) return;
		selectedFile = null;
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function needsProfileData() {
		return selectedType === 'business' || selectedType === 'charity';
	}

	function canSubmit() {
		if (needsProfileData()) {
			return formData.name && formData.description && selectedFile;
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

<div class="flex min-h-screen items-center justify-center bg-base-200 px-4 py-8">
	<div class="w-full max-w-md">
		{#if step === 1}
			<div class="fade-in">
				<div class="mb-6 text-center">
					<h1 class="mb-2 text-2xl font-bold">Welcome!</h1>
					<p class="text-sm text-base-content/70">Choose your account type</p>
				</div>

				<div class="card bg-base-100 shadow-xl">
					<div class="card-body p-4">
						<div class="space-y-3">
							{#each accountTypes as type}
								<button
									type="button"
									class="flex w-full items-center gap-3 rounded-lg border-2 p-4 transition-all"
									class:border-primary={selectedType === type.id}
									class:bg-primary-5={selectedType === type.id}
									class:border-base-300={selectedType !== type.id}
									class:hover:border-base-content-20={selectedType !== type.id}
									onclick={() => selectType(type.id)}
								>
									<svelte:component this={type.icon} class="h-6 w-6 shrink-0" />
									<div class="flex-1 text-left">
										<h3 class="text-base font-semibold">{type.title}</h3>
										<p class="text-xs text-base-content/60">{type.description}</p>
									</div>
								</button>
							{/each}
						</div>
					</div>
				</div>

				{#if selectedType !== null}
					<div class="mt-4 flex justify-end">
						<button type="button" class="btn btn-circle btn-primary" onclick={handleContinue}>
							<IconArrowRight class="h-5 w-5" />
						</button>
					</div>
				{/if}
			</div>
		{:else if step === 2}
			<div class="fade-in">
				<div class="mb-6 text-center">
					<h1 class="mb-2 text-2xl font-bold">
						{needsProfileData() ? 'Profile Details' : 'All Set!'}
					</h1>
					<p class="text-sm text-base-content/70">
						{needsProfileData() ? 'Tell us about your organization' : 'Your account is ready to go'}
					</p>
				</div>

				<form
					method="POST"
					action="?/setup"
					enctype="multipart/form-data"
					class="card bg-base-100 shadow-xl"
					use:enhance={() => {
						uploading = true;
						return async ({ result, update }) => {
							uploading = false;
							if (result.type === 'success') {
								// Redirect handled by server
							} else if (result.type === 'failure' && result.data) {
								const errorData = result.data as { error?: string };
								alert(errorData.error || 'Setup failed. Please try again.');
							}
							await update();
						};
					}}
				>
					<div class="card-body p-4">
						<input type="hidden" name="accountType" value={selectedType} />

						{#if needsProfileData()}
							<div class="space-y-4">
								<!-- Name -->
								<div class="form-control">
									<label class="label" for="name">
										<span class="label-text text-sm font-medium">Organization Name*</span>
									</label>
									<input
										id="name"
										name="name"
										type="text"
										placeholder="Enter name"
										class="input input-bordered w-full"
										bind:value={formData.name}
										required
									/>
								</div>

								<!-- Description -->
								<div class="form-control">
									<label class="label" for="description">
										<span class="label-text text-sm font-medium">Description*</span>
									</label>
									<textarea
										id="description"
										name="description"
										placeholder="Brief description"
										class="textarea textarea-bordered w-full"
										rows="3"
										bind:value={formData.description}
										required
									></textarea>
								</div>

								<!-- File Upload -->
								<div class="form-control">
									<label class="label" for="picture">
										<span class="label-text text-sm font-medium">Profile Picture*</span>
									</label>

									<input
										bind:this={fileInput}
										id="picture"
										name="picture"
										type="file"
										accept="image/*"
										class="hidden"
										onchange={handleFileSelect}
										required
									/>

									<button
										type="button"
										onclick={() => fileInput?.click()}
										disabled={uploading}
										class="relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-all"
										class:border-base-300={!selectedFile}
										class:border-success={selectedFile}
										class:bg-success-5={selectedFile}
										class:hover:border-base-content-20={!uploading && !selectedFile}
										class:opacity-50={uploading}
									>
										{#if !selectedFile}
											<div
												class="flex min-h-[120px] flex-col items-center justify-center gap-2 p-4"
											>
												<IconImage class="h-8 w-8 text-base-content/40" />
												<p class="text-sm text-base-content">Tap to select image</p>
												<p class="text-xs text-base-content/60">Images • 5MB max</p>
											</div>
										{:else}
											<div class="flex gap-3 p-3">
												<div class="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
													<img src={previewUrl} alt="Preview" class="h-full w-full object-cover" />
												</div>
												<div class="flex min-w-0 flex-1 flex-col justify-center text-left">
													<p class="truncate text-sm font-medium" title={selectedFile.name}>
														{selectedFile.name}
													</p>
													<p class="text-xs text-base-content/60">
														{Math.round(selectedFile.size / 1024)} KB
													</p>
												</div>
											</div>
										{/if}
									</button>
								</div>
							</div>
						{:else}
							<div class="py-4 text-center text-sm text-base-content/70">
								Click below to complete your account setup
							</div>
						{/if}
					</div>

					<!-- Navigation -->
					<div class="card-body border-t border-base-300 p-4">
						<div class="flex items-center justify-between">
							<button
								type="button"
								class="btn btn-circle btn-ghost"
								onclick={handleBack}
								disabled={uploading}
							>
								<IconArrowLeft class="h-5 w-5" />
							</button>

							<button type="submit" class="btn btn-primary" disabled={!canSubmit() || uploading}>
								{#if uploading}
									<span class="loading loading-spinner loading-sm"></span>
									Setting up...
								{:else}
									<IconCloudArrowUp class="h-5 w-5" />
									Complete Setup
								{/if}
							</button>
						</div>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>

<style>
	.fade-in {
		animation: fade-in 0.3s ease-out;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
