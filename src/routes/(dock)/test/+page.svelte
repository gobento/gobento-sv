<!-- src/routes/(public)/test/+page.svelte -->
<script lang="ts">
	import type { ActionData } from './$types';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import IconCloudArrowUp from '~icons/fluent/cloud-arrow-up-24-regular';
	import IconCheckmarkCircle from '~icons/fluent/checkmark-circle-24-filled';
	import IconDismissCircle from '~icons/fluent/dismiss-circle-24-filled';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconOpen from '~icons/fluent/open-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';

	interface Props {
		form: ActionData;
	}

	let { form }: Props = $props();

	let uploadHistory = $state<
		Array<{ url: string; key: string; fileName: string; timestamp: number }>
	>([]);
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'info' | 'success' | 'error'>('info');

	function saveToHistory(url: string, key: string, fileName: string) {
		const newItem = { url, key, fileName, timestamp: Date.now() };
		const exists = uploadHistory.some((item) => item.key === key);
		if (!exists) {
			uploadHistory = [newItem, ...uploadHistory].slice(0, 10);
		}
	}

	function clearHistory() {
		uploadHistory = [];
	}

	function copyUrl(url: string) {
		// Convert relative URL to absolute for copying
		const absoluteUrl = new URL(url, window.location.origin).toString();
		navigator.clipboard.writeText(absoluteUrl);
		toastType = 'success';
		showToast = true;
		toastMessage = 'URL copied to clipboard!';
		setTimeout(() => {
			showToast = false;
		}, 2000);
	}

	function handleUploadSuccess(data: { url: string; fileName: string; key: string }) {
		saveToHistory(data.url, data.key, data.fileName);
		toastType = 'success';
		showToast = true;
		toastMessage = 'Upload successful!';
		setTimeout(() => {
			showToast = false;
		}, 3000);
	}

	function handleUploadError(error: string) {
		toastType = 'error';
		showToast = true;
		toastMessage = error;
		setTimeout(() => {
			showToast = false;
		}, 3000);
	}

	// When form succeeds, add to history
	$effect(() => {
		if (form?.success && form?.url && form?.key && form?.fileName) {
			saveToHistory(form.url, form.key, form.fileName);
		}
	});
</script>

<div class="min-h-screen bg-base-200 px-3 py-6 sm:px-4 sm:py-8">
	<div class="mx-auto max-w-2xl">
		<!-- Header -->
		<div class="mb-6 text-center sm:mb-8">
			<div class="mb-3 inline-flex items-center justify-center rounded-2xl bg-primary/10 p-3">
				<IconCloudArrowUp class="h-8 w-8 text-primary sm:h-10 sm:w-10" />
			</div>
			<h1 class="mb-2 text-2xl font-bold sm:text-4xl">File Upload</h1>
			<p class="text-sm text-base-content/70 sm:text-base">Test your Backblaze B2 configuration</p>
		</div>

		<!-- Upload Form -->
		<div class="card mb-4 bg-base-100 shadow-xl sm:mb-6">
			<div class="card-body p-4 sm:p-6">
				<FileUpload
					action="?/upload"
					maxSizeBytes={5 * 1024 * 1024}
					acceptedTypes="image/*"
					uploadCooldownMs={2000}
					onSuccess={handleUploadSuccess}
					onError={handleUploadError}
				/>
			</div>
		</div>

		<!-- Success Alert -->
		{#if form?.success}
			<div class="mb-4 alert alert-success shadow-lg sm:mb-6">
				<IconCheckmarkCircle class="h-6 w-6 shrink-0" />
				<div class="flex-1">
					<h3 class="text-sm font-bold sm:text-base">Upload Successful!</h3>
					<p class="text-xs sm:text-sm">{form.fileName}</p>
				</div>
			</div>

			<!-- Uploaded Image Card -->
			<div class="card mb-4 bg-base-100 shadow-xl sm:mb-6">
				<figure class="px-4 pt-4">
					<img
						src={form.url}
						alt="Uploaded"
						class="w-full rounded-lg object-contain"
						style="max-height: 300px;"
					/>
				</figure>
				<div class="card-body p-4">
					<div class="flex flex-wrap gap-2">
						<button
							onclick={() => copyUrl(form.url)}
							class="btn flex-1 btn-outline btn-sm sm:flex-none"
						>
							<IconCopy class="h-4 w-4" />
							Copy URL
						</button>
						<a
							href={form.url}
							target="_blank"
							rel="noopener noreferrer"
							class="btn flex-1 btn-sm btn-primary sm:flex-none"
						>
							<IconOpen class="h-4 w-4" />
							Open
						</a>
					</div>
				</div>
			</div>
		{/if}

		<!-- Error Alert -->
		{#if form?.error}
			<div class="mb-4 alert alert-error shadow-lg sm:mb-6">
				<IconDismissCircle class="h-6 w-6 shrink-0" />
				<div>
					<h3 class="text-sm font-bold sm:text-base">Upload Failed</h3>
					<p class="text-xs sm:text-sm">{form.error}</p>
				</div>
			</div>
		{/if}

		<!-- Upload History -->
		{#if uploadHistory.length > 0}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body p-4 sm:p-6">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-bold sm:text-xl">Recent Uploads</h2>
						<button onclick={clearHistory} class="btn btn-ghost btn-sm">
							<IconDelete class="h-4 w-4" />
							Clear
						</button>
					</div>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
						{#each uploadHistory as item}
							<div class="card bg-base-200 shadow">
								<figure class="px-3 pt-3">
									<img
										src={item.url}
										alt={item.fileName}
										class="h-32 w-full rounded-lg object-cover sm:h-40"
									/>
								</figure>
								<div class="card-body p-3">
									<h3 class="truncate text-sm font-semibold">{item.fileName}</h3>
									<p class="text-xs text-base-content/60">
										{new Date(item.timestamp).toLocaleDateString()}
									</p>
									<div class="mt-2 flex gap-2">
										<button onclick={() => copyUrl(item.url)} class="btn flex-1 btn-ghost btn-xs">
											<IconCopy class="h-3 w-3" />
										</button>
										<a
											href={item.url}
											target="_blank"
											rel="noopener noreferrer"
											class="btn flex-1 btn-outline btn-xs"
										>
											<IconOpen class="h-3 w-3" />
										</a>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Info Footer -->
		<div class="mt-6 text-center text-xs text-base-content/60 sm:text-sm">
			<p>Files are tracked in the database with uploader and timestamp info</p>
		</div>
	</div>
</div>

<!-- Toast Notification -->
{#if showToast}
	<div class="toast toast-center toast-top">
		<div
			class="alert"
			class:alert-info={toastType === 'info'}
			class:alert-success={toastType === 'success'}
			class:alert-error={toastType === 'error'}
		>
			<span>{toastMessage}</span>
		</div>
	</div>
{/if}
