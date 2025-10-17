<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import IconBriefcase from '~icons/fluent-emoji/briefcase';
	import IconPerson from '~icons/fluent-emoji/bust-in-silhouette';
	import IconHeart from '~icons/fluent-emoji/red-heart';
	import IconArrowRight from '~icons/fluent-emoji/right-arrow';

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

	let selectedType = $state<number | null>(null);

	function selectType(id: number) {
		selectedType = id;
	}

	function handleContinue() {
		if (selectedType !== null) {
			// Navigate to next page
			console.log('Continue with type:', selectedType);
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-base-200 px-4 py-8">
	<div class="w-full max-w-md">
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
</div>
