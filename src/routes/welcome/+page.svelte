<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import IconBriefcase from '~icons/fluent-emoji/briefcase';
	import IconPerson from '~icons/fluent-emoji/bust-in-silhouette';
	import IconHeart from '~icons/fluent-emoji/red-heart';
	import IconArrowRight from '~icons/fluent-emoji/right-arrow';
	import IconArrowLeft from '~icons/fluent-emoji/left-arrow';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	interface AccountType {
		id: number;
		name: string;
		title: string;
		description: string;
		icon: any;
	}

	let accountTypes: AccountType[] = [
		{
			id: 1,
			name: 'business',
			title: 'Business',
			description: 'For companies and organizations',
			icon: IconBriefcase
		},
		{
			id: 2,
			name: 'user',
			title: 'Personal',
			description: 'For individual use',
			icon: IconPerson
		},
		{
			id: 3,
			name: 'charity',
			title: 'Charity',
			description: 'For non-profit organizations',
			icon: IconHeart
		}
	];

	let step = $state<number>(1);
	let selectedType = $state<number | null>(null);

	// Form data
	let formData = $state({
		name: '',
		description: '',
		bankAccount: '',
		bankRoutingNumber: '',
		pictureUrl: ''
	});

	function selectType(id: number) {
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

	function handleSubmit() {
		console.log('Form submitted:', {
			accountType: selectedType,
			...formData
		});
		// Submit form data to server
	}

	function isBusinessOrCharity() {
		return selectedType === 1 || selectedType === 3;
	}

	function canSubmit() {
		if (isBusinessOrCharity()) {
			return formData.name && formData.description && formData.bankAccount;
		} else {
			return formData.bankAccount && formData.bankRoutingNumber;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-base-200 px-4 py-8">
	<div class="w-full max-w-md">
		{#if step === 1}
			<div style="view-transition-name: account-setup;">
				<!-- Welcome Text -->
				<div class="mb-8 text-center">
					<h1 class="mb-2 text-3xl font-bold">Welcome!</h1>
					<p class="text-base-content/70">Let's get started by choosing your account type</p>
				</div>

				<!-- Selection Card -->
				<div class="card bg-base-100 shadow-xl">
					<div class="card-body p-4 md:p-6">
						<div class="space-y-2">
							{#each accountTypes as type}
								<button
									class="flex w-full items-center gap-4 rounded-lg border-2 p-4 transition-all duration-200 {selectedType ===
									type.id
										? 'border-primary bg-primary/10'
										: 'hover:border-base-400 border-base-300 hover:bg-base-200'}"
									onclick={() => selectType(type.id)}
								>
									<div class="flex-shrink-0 text-4xl">
										<type.icon />
									</div>
									<div class="flex-1 text-left">
										<h3 class="text-lg font-semibold">{type.title}</h3>
										<p class="text-sm text-base-content/60">{type.description}</p>
									</div>
								</button>
							{/each}
						</div>
					</div>
				</div>

				<!-- Continue Button -->
				{#if selectedType !== null}
					<div class="mt-6 flex justify-end">
						<button class="btn btn-circle shadow-lg btn-lg btn-primary" onclick={handleContinue}>
							<IconArrowRight class="h-6 w-6" />
						</button>
					</div>
				{/if}
			</div>
		{:else if step === 2}
			<div style="view-transition-name: account-setup;">
				<!-- Details Form -->
				<div class="mb-8 text-center">
					<h1 class="mb-2 text-3xl font-bold">Account Details</h1>
					<p class="text-base-content/70">
						{isBusinessOrCharity()
							? 'Tell us about your organization'
							: 'Enter your banking information'}
					</p>
				</div>

				<div class="card bg-base-100 shadow-xl">
					<div class="card-body p-4 md:p-6">
						<form
							class="space-y-4"
							onsubmit={(e) => {
								e.preventDefault();
								handleSubmit();
							}}
						>
							{#if isBusinessOrCharity()}
								<!-- Business/Charity Fields -->
								<div class="form-control">
									<label class="label" for="name">
										<span class="label-text font-medium">Organization Name*</span>
									</label>
									<input
										id="name"
										type="text"
										placeholder="Enter organization name"
										class="input-bordered input w-full"
										bind:value={formData.name}
										required
									/>
								</div>

								<div class="form-control">
									<label class="label" for="description">
										<span class="label-text font-medium">Short Description*</span>
									</label>
									<textarea
										id="description"
										placeholder="Brief description of your organization"
										class="textarea-bordered textarea w-full"
										rows="3"
										bind:value={formData.description}
										required
									></textarea>
								</div>

								<div class="form-control">
									<label class="label" for="picture">
										<span class="label-text font-medium">Logo/Picture URL</span>
									</label>
									<input
										id="picture"
										type="url"
										placeholder="https://example.com/logo.png"
										class="input-bordered input w-full"
										bind:value={formData.pictureUrl}
									/>
								</div>
							{/if}

							<!-- Bank Details (for all types) -->
							<div class="form-control">
								<label class="label" for="bank-account">
									<span class="label-text font-medium">Bank Account Number*</span>
								</label>
								<input
									id="bank-account"
									type="text"
									placeholder="Enter account number"
									class="input-bordered input w-full"
									bind:value={formData.bankAccount}
									required
								/>
							</div>

							{#if !isBusinessOrCharity()}
								<div class="form-control">
									<label class="label" for="routing">
										<span class="label-text font-medium">Routing Number*</span>
									</label>
									<input
										id="routing"
										type="text"
										placeholder="Enter routing number"
										class="input-bordered input w-full"
										bind:value={formData.bankRoutingNumber}
										required
									/>
								</div>
							{/if}
						</form>
					</div>
				</div>

				<!-- Navigation Buttons -->
				<div class="mt-6 flex items-center justify-between">
					<button class="btn btn-circle btn-lg" onclick={handleBack}>
						<IconArrowLeft class="h-6 w-6" />
					</button>

					{#if canSubmit()}
						<button class="btn btn-lg btn-primary" onclick={handleSubmit}> Complete Setup </button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
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

	div[style*='view-transition-name'] {
		animation: fade-in 0.3s ease-out;
	}
</style>
