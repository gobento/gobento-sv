<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';

	interface Props {
		form: ActionData;
	}

	let { form }: Props = $props();

	let uploading = $state(false);
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let uploadHistory = $state<
		Array<{ url: string; key: string; fileName: string; timestamp: number }>
	>([]);

	let fileInput: HTMLInputElement;

	// Initialize history
	$effect(() => {
		uploadHistory = [];
	});

	// When form succeeds, add to history
	$effect(() => {
		if (form?.success && form?.url && form?.key && form?.fileName) {
			saveToHistory(form.url, form.key, form.fileName);
			clearFile();
		}
	});

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

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			selectedFile = file;
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
			previewUrl = URL.createObjectURL(file);
			console.log('File selected:', file.name, file.size, file.type);
		}
	}

	function clearFile() {
		selectedFile = null;
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
		if (fileInput) {
			fileInput.value = '';
		}
	}
</script>

<div class="min-h-screen bg-base-200 px-4 py-8">
	<div class="mx-auto max-w-2xl">
		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="mb-2 text-4xl font-bold">Backblaze Upload Test</h1>
			<p class="text-base-content/70">Test your Backblaze B2 configuration</p>
		</div>

		<!-- Upload Form -->
		<div class="card mb-6 bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Upload Image</h2>

				<form
					method="POST"
					action="?/upload"
					enctype="multipart/form-data"
					use:enhance={() => {
						uploading = true;
						console.log('Form submitting...');

						return async ({ result, update }) => {
							console.log('Form result:', result);
							uploading = false;
							await update();
						};
					}}
					class="space-y-4"
				>
					<!-- File Input -->
					<div class="form-control">
						<label class="label" for="file">
							<span class="label-text font-medium">Select an image</span>
						</label>
						<input
							bind:this={fileInput}
							id="file"
							name="file"
							type="file"
							accept="image/*"
							class="file-input-bordered file-input w-full"
							onchange={handleFileSelect}
							disabled={uploading}
							required
						/>
						{#if selectedFile}
							<label class="label">
								<span class="label-text-alt text-success">
									Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
								</span>
							</label>
						{/if}
					</div>

					<!-- Preview -->
					{#if previewUrl}
						<div class="form-control">
							<label class="label">
								<span class="label-text font-medium">Preview</span>
							</label>
							<div class="flex items-start gap-4">
								<img
									src={previewUrl}
									alt="Preview"
									class="h-48 w-48 rounded-lg border-2 border-base-300 object-cover"
								/>
								<button type="button" class="btn btn-ghost btn-sm" onclick={clearFile}>
									Clear
								</button>
							</div>
						</div>
					{/if}

					<!-- Submit Button -->
					<div class="form-control mt-6">
						<button
							type="submit"
							class="btn btn-block btn-primary"
							disabled={!selectedFile || uploading}
						>
							{#if uploading}
								<span class="loading loading-spinner"></span>
								Uploading...
							{:else}
								Upload to Backblaze
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Results -->
		{#if form?.success}
			<div class="mb-6 alert alert-success shadow-lg">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6 shrink-0 stroke-current"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<div>
					<h3 class="font-bold">Upload Successful!</h3>
					<p class="text-sm">File uploaded: {form.fileName}</p>
				</div>
			</div>

			<!-- Display Uploaded Image -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">Uploaded Image</h2>
					<figure class="mt-4">
						<img src={form.url} alt="Uploaded" class="max-h-96 rounded-lg object-contain" />
					</figure>
					<div class="mt-4 card-actions justify-end">
						<a
							href={form.url}
							target="_blank"
							rel="noopener noreferrer"
							class="btn btn-outline btn-sm"
						>
							Open in New Tab
						</a>
						<button
							class="btn btn-ghost btn-sm"
							onclick={() => {
								navigator.clipboard.writeText(form.url);
								alert('URL copied to clipboard!');
							}}
						>
							Copy URL
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if form?.error}
			<div class="alert alert-error shadow-lg">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6 shrink-0 stroke-current"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<div>
					<h3 class="font-bold">Upload Failed</h3>
					<p class="text-sm">{form.error}</p>
				</div>
			</div>
		{/if}

		<!-- Upload History -->
		{#if uploadHistory.length > 0}
			<div class="card mb-6 bg-base-100 shadow-xl">
				<div class="card-body">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="card-title">Recent Uploads</h2>
						<button class="btn btn-ghost btn-sm" onclick={clearHistory}> Clear History </button>
					</div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						{#each uploadHistory as item}
							<div class="card bg-base-200 shadow">
								<figure class="px-4 pt-4">
									<img
										src={item.url}
										alt={item.fileName}
										class="h-48 w-full rounded-lg object-cover"
									/>
								</figure>
								<div class="card-body p-4">
									<h3 class="truncate text-sm font-semibold">{item.fileName}</h3>
									<p class="text-xs text-base-content/60">
										{new Date(item.timestamp).toLocaleString()}
									</p>
									<div class="mt-2 card-actions justify-end">
										<button
											class="btn btn-ghost btn-xs"
											onclick={() => {
												navigator.clipboard.writeText(item.url);
												alert('URL copied!');
											}}
										>
											Copy URL
										</button>
										<a
											href={item.url}
											target="_blank"
											rel="noopener noreferrer"
											class="btn btn-outline btn-xs"
										>
											View
										</a>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Info -->
		<div class="mt-6 text-center text-sm text-base-content/60">
			<p>This page tests your Backblaze B2 configuration.</p>
			<p class="mt-2">
				Make sure your <code class="rounded bg-base-300 px-2 py-1">.env</code> file has all the required
				credentials.
			</p>
		</div>
	</div>

	<img src="/api/image/{encodeURIComponent('test-uploads/test-1760997078839.jpg')}" alt="Upload" />
</div>
