<!-- src/routes/(app)/profile/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import { enhance } from '$app/forms';
	import IconUser from '~icons/fluent/person-24-regular';
	import IconBuilding from '~icons/fluent/building-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconShield from '~icons/fluent/shield-24-regular';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconCheck from '~icons/fluent/checkmark-24-regular';
	import IconSparkle from '~icons/fluent/sparkle-24-regular';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let editing = $state(false);
	let saving = $state(false);
	let uploadedFileId = $state<string | null>(null);
	let uploadError = $state<string | null>(null);
	let formError = $state<string | null>(null);

	// Form fields for editing
	let editName = $state('');
	let editDescription = $state('');
	let newProfilePicture = $state<string | null>(null);

	const canEdit = $derived(
		data.account.accountType === 'business' || data.account.accountType === 'charity'
	);

	const hasProfile = $derived(data.profile !== null);

	function startEditing() {
		if (data.profile) {
			editName = data.profile.name || '';
			editDescription = data.profile.description || '';
		} else {
			editName = '';
			editDescription = '';
		}
		newProfilePicture = data.profilePictureUrl;
		uploadedFileId = data.profile?.profilePictureId || null;
		editing = true;
		uploadError = null;
		formError = null;
	}

	function cancelEditing() {
		editing = false;
		uploadError = null;
		formError = null;
		uploadedFileId = null;
		newProfilePicture = null;
	}

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
					label: 'Business',
					bgGradient: 'from-blue-500/10 to-cyan-500/10',
					accentColor: 'text-blue-600',
					ringColor: 'ring-blue-500',
					badgeStyle: 'badge-info',
					headerIcon: IconBuilding,
					emptyMessage: 'Build your business profile to showcase your brand'
				};
			case 'charity':
				return {
					icon: IconHeart,
					label: 'Charity',
					bgGradient: 'from-pink-500/10 to-rose-500/10',
					accentColor: 'text-pink-600',
					ringColor: 'ring-pink-500',
					badgeStyle: 'badge-secondary',
					headerIcon: IconHeart,
					emptyMessage: 'Create your charity profile to connect with supporters'
				};
			case 'admin':
				return {
					icon: IconShield,
					label: 'Admin',
					bgGradient: 'from-purple-500/10 to-indigo-500/10',
					accentColor: 'text-purple-600',
					ringColor: 'ring-purple-500',
					badgeStyle: 'badge-accent',
					headerIcon: IconShield,
					emptyMessage: ''
				};
			default:
				return {
					icon: IconUser,
					label: 'User',
					bgGradient: 'from-gray-500/10 to-slate-500/10',
					accentColor: 'text-gray-600',
					ringColor: 'ring-gray-500',
					badgeStyle: 'badge-neutral',
					headerIcon: IconUser,
					emptyMessage: ''
				};
		}
	}

	const config = $derived(getAccountTypeConfig(data.account.accountType));
</script>

<!-- Different card styles based on account type -->
<div class="card overflow-hidden bg-base-100 shadow-xl">
	<!-- Header banner with gradient -->
	<div class="h-32 bg-linear-to-r {config.bgGradient} relative">
		<div class="absolute inset-0 flex items-center justify-center opacity-20">
			<config.headerIcon class="h-24 w-24" />
		</div>
	</div>

	<div class="relative -mt-16 card-body">
		<!-- Profile Picture (overlapping the banner) -->
		<div class="mb-4 flex justify-center">
			<div class="avatar">
				<div
					class="h-32 w-32 rounded-full ring-4 {config.ringColor} bg-base-100 ring-offset-4 ring-offset-base-100"
				>
					{#if data.profilePictureUrl}
						<img src={data.profilePictureUrl} alt="Profile" />
					{:else}
						<div class="flex h-full w-full items-center justify-center bg-base-200">
							<config.icon class="h-16 w-16 text-base-content/40" />
						</div>
					{/if}
				</div>
			</div>
		</div>

		{#if !editing}
			<!-- View Mode -->
			<div class="text-center">
				<!-- Name or Placeholder -->
				{#if hasProfile && data.profile}
					<h1 class="mb-2 text-3xl font-bold">{data.profile.name}</h1>
					<p class="mx-auto mb-4 max-w-xl text-base-content/70">
						{data.profile.description}
					</p>
				{:else if canEdit}
					<h1 class="mb-2 text-3xl font-bold text-base-content/50">Profile Incomplete</h1>
					<div class="mx-auto mb-4 alert max-w-md alert-info">
						<IconSparkle class="size-5" />
						<span class="text-sm">{config.emptyMessage}</span>
					</div>
				{:else}
					<!-- User/Admin without editable profile -->
					<h1 class="mb-4 text-3xl font-bold">
						{data.account.accountType === 'admin' ? 'Administrator' : 'My Profile'}
					</h1>
				{/if}

				<!-- Account Type Badge -->
				<div class="badge {config.badgeStyle} mb-4 gap-2 badge-lg">
					<config.icon class="size-4 " />
					{config.label}
				</div>

				<!-- Email -->
				<p class="mb-6 text-sm text-base-content/60">{data.account.email}</p>

				<div class="divider mx-auto max-w-md"></div>

				<!-- Account Info -->
				<div class="mx-auto max-w-md">
					<div class="stats stats-vertical shadow-sm lg:stats-horizontal">
						<div class="stat place-items-center">
							<div class="stat-title">Member Since</div>
							<div class="stat-value text-xl {config.accentColor}">
								{new Date(data.account.createdAt).toLocaleDateString('en-US', {
									month: 'short',
									year: 'numeric'
								})}
							</div>
						</div>

						{#if data.account.accountType === 'admin'}
							<div class="stat place-items-center">
								<div class="stat-title">Access Level</div>
								<div class="stat-value text-xl {config.accentColor}">Full</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="mt-8 flex flex-wrap justify-center gap-3">
					{#if canEdit}
						<button onclick={startEditing} class="btn gap-2 btn-primary">
							<IconEdit class="size-5" />
							{hasProfile ? 'Edit Profile' : 'Complete Profile'}
						</button>
					{/if}

					<a href="/auth/logout" class="btn btn-secondary">Logout</a>
				</div>
			</div>
		{:else}
			<!-- Edit Mode -->
			<div class="mx-auto w-full max-w-2xl">
				<h2 class="mb-6 text-center text-2xl font-bold">Edit Your Profile</h2>

				<form
					method="POST"
					action="?/updateProfile"
					use:enhance={() => {
						saving = true;
						formError = null;
						return async ({ result, update }) => {
							saving = false;
							if (result.type === 'success') {
								editing = false;
								await update();
							} else if (result.type === 'failure' && result.data) {
								const errorData = result.data as { error?: string };
								formError = errorData.error || 'Failed to update profile';
							}
							await update();
						};
					}}
					class="space-y-6"
				>
					<input type="hidden" name="profilePictureId" value={uploadedFileId || ''} />

					<!-- Profile Picture Upload -->
					<div>
						<label class="label">
							<span class="label-text font-semibold">Profile Picture</span>
							<span class="label-text-alt text-error">Required</span>
						</label>
						{#if newProfilePicture}
							<div class="mb-4 flex justify-center">
								<div class="avatar">
									<div class="h-32 w-32 rounded-full ring-4 {config.ringColor}">
										<img src={newProfilePicture} alt="Preview" />
									</div>
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
							<div class="mt-2 alert alert-error">
								<span>{uploadError}</span>
							</div>
						{/if}
					</div>

					<!-- Name -->
					<div class="form-control">
						<label class="label" for="name">
							<span class="label-text font-semibold">
								{data.account.accountType === 'business' ? 'Business Name' : 'Organization Name'}
							</span>
							<span class="label-text-alt text-error">Required</span>
						</label>
						<input
							id="name"
							name="name"
							type="text"
							bind:value={editName}
							placeholder={data.account.accountType === 'business'
								? 'Enter your business name'
								: 'Enter your organization name'}
							class="input-bordered input input-lg"
							required
							disabled={saving}
						/>
					</div>

					<!-- Description -->
					<div class="form-control">
						<label class="label" for="description">
							<span class="label-text font-semibold">Description</span>
							<span class="label-text-alt text-error">Required</span>
						</label>
						<textarea
							id="description"
							name="description"
							bind:value={editDescription}
							placeholder={data.account.accountType === 'business'
								? 'Tell customers about your business, products, and services...'
								: 'Share your mission, impact, and how people can support your cause...'}
							class="textarea-bordered textarea h-40 textarea-lg"
							required
							disabled={saving}
						></textarea>
						<label class="label">
							<span class="label-text-alt">{editDescription.length} characters</span>
						</label>
					</div>

					{#if formError}
						<div class="alert alert-error">
							<span>{formError}</span>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex gap-3">
						<button
							type="submit"
							class="btn flex-1 btn-lg btn-primary"
							disabled={saving || !uploadedFileId}
						>
							{#if saving}
								<span class="loading loading-spinner"></span>
								Saving...
							{:else}
								<IconCheck class="size-5" />
								Save Changes
							{/if}
						</button>
						<button
							type="button"
							onclick={cancelEditing}
							class="btn flex-1 btn-outline btn-lg"
							disabled={saving}
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>
