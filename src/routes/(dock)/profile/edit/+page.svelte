<!-- src/routes/(dock)/profile/edit/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import IconUser from '~icons/fluent/person-24-regular';
	import IconBuilding from '~icons/fluent/building-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconCheck from '~icons/fluent/checkmark-24-regular';
	import IconImage from '~icons/fluent/image-24-regular';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let saving = $state(false);
	let uploadedFileId = $state<string | null>(data.profile?.profilePictureId || null);
	let uploadError = $state<string | null>(null);
	let formError = $state<string | null>(null);

	// Form fields
	let editName = $state(data.profile?.name || '');
	let editDescription = $state(data.profile?.description || '');
	let newProfilePicture = $state<string | null>(data.profilePictureUrl);

	function handleUploadSuccess(uploadData: { url: string; fileName: string; key: string }) {
		uploadedFileId = uploadData.key;
		newProfilePicture = uploadData.url;
		uploadError = null;
	}

	function handleUploadError(error: string) {
		uploadError = error;
	}

	function getAccountTypeConfig(type: string) {
		switch (type) {
			case 'business':
				return {
					icon: IconBuilding,
					namePlaceholder: 'Enter your business name',
					descriptionPlaceholder: 'Tell customers about your business, products, and services...'
				};
			case 'charity':
				return {
					icon: IconHeart,
					namePlaceholder: 'Enter your organization name',
					descriptionPlaceholder:
						'Share your mission, impact, and how people can support your cause...'
				};
			default:
				return {
					icon: IconUser,
					namePlaceholder: 'Enter name',
					descriptionPlaceholder: 'Enter description...'
				};
		}
	}

	const config = $derived(getAccountTypeConfig(data.account.accountType));
</script>

<div class="mx-auto max-w-3xl">
	<div class="bg-base-100">
		<!-- Header -->
		<div class="border-b border-base-300 px-6 py-6">
			<div class="mb-4">
				<a href="/profile" class="btn gap-2 btn-ghost btn-sm">
					<IconArrowLeft class="h-4 w-4" />
					Back to Profile
				</a>
			</div>
			<h1 class="text-2xl font-semibold">Edit Your Profile</h1>
			<p class="mt-1 text-sm text-base-content/60">Update your profile information and picture</p>
		</div>

		<!-- Form -->
		<form
			method="POST"
			action="?/updateProfile"
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
			class="px-6 py-8"
		>
			<input type="hidden" name="profilePictureId" value={uploadedFileId || ''} />

			<div class="space-y-8">
				<!-- Profile Picture -->
				<div>
					<label class="mb-3 block">
						<span class="text-sm font-medium">Profile Picture</span>
						<span class="ml-1 text-sm text-error">*</span>
					</label>

					{#if newProfilePicture}
						<div class="mb-6 flex justify-center">
							<div class="avatar">
								<div class="w-32 rounded-full bg-base-200">
									<img src={newProfilePicture} alt="Preview" />
								</div>
							</div>
						</div>
					{:else}
						<div class="mb-6 flex justify-center">
							<div class="flex h-32 w-32 items-center justify-center rounded-full bg-base-200">
								<IconImage class="h-12 w-12 text-base-content/30" />
							</div>
						</div>
					{/if}

					<FileUpload
						action="?/upload"
						maxSizeBytes={5 * 1024 * 1024}
						acceptedTypes="image/*"
						disabled={saving}
						onSuccess={handleUploadSuccess}
						onError={handleUploadError}
					/>

					{#if uploadError}
						<div class="mt-3 rounded-lg border border-error/20 bg-error/10 px-4 py-3">
							<p class="text-sm text-error">{uploadError}</p>
						</div>
					{/if}
				</div>

				<!-- Name -->
				<div class="form-control">
					<label class="mb-3 block" for="name">
						<span class="text-sm font-medium">
							{data.account.accountType === 'business' ? 'Business Name' : 'Organization Name'}
						</span>
						<span class="ml-1 text-sm text-error">*</span>
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
					<label class="mb-3 block" for="description">
						<span class="text-sm font-medium">Description</span>
						<span class="ml-1 text-sm text-error">*</span>
					</label>
					<textarea
						id="description"
						name="description"
						bind:value={editDescription}
						placeholder={config.descriptionPlaceholder}
						class="textarea-bordered textarea h-40 w-full"
						required
						disabled={saving}
					></textarea>
					<div class="mt-2 text-right">
						<span class="text-xs text-base-content/50">{editDescription.length} characters</span>
					</div>
				</div>

				{#if formError}
					<div class="rounded-lg border border-error/20 bg-error/10 px-4 py-3">
						<p class="text-sm text-error">{formError}</p>
					</div>
				{/if}

				<!-- Action Buttons -->
				<div class="flex gap-3 border-t border-base-300 pt-6">
					<button
						type="submit"
						class="btn flex-1 btn-primary"
						disabled={saving || !uploadedFileId || !editName.trim() || !editDescription.trim()}
					>
						{#if saving}
							<span class="loading loading-spinner"></span>
							Saving...
						{:else}
							<IconCheck class="h-5 w-5" />
							Save Changes
						{/if}
					</button>
					<a href="/profile" class="btn flex-1 btn-outline" class:btn-disabled={saving}> Cancel </a>
				</div>
			</div>
		</form>
	</div>
</div>
