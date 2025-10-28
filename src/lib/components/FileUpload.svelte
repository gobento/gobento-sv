<!-- src/lib/components/FileUpload.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconCloudArrowUp from '~icons/fluent/cloud-arrow-up-24-regular';
	import IconImage from '~icons/fluent/image-24-regular';

	interface Props {
		action?: string;
		maxSizeBytes?: number;
		acceptedTypes?: string;
		disabled?: boolean;
		onSuccess?: (data: { url: string; fileName: string; key: string }) => void;
		onError?: (error: string) => void;
		uploadCooldownMs?: number;
	}

	let {
		action = '?/upload',
		maxSizeBytes = 5 * 1024 * 1024,
		acceptedTypes = 'image/*',
		disabled = false,
		onSuccess,
		onError,
		uploadCooldownMs = 2000
	}: Props = $props();

	let uploading = $state(false);
	let dragActive = $state(false);
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let lastUploadTime = $state(0);
	let cooldownRemaining = $state(0);
	let cooldownInterval: ReturnType<typeof setInterval> | null = null;

	let fileInput: HTMLInputElement;

	const maxSizeMB = maxSizeBytes / (1024 * 1024);
	const canUpload = $derived(!uploading && selectedFile !== null && cooldownRemaining === 0);

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		processFile(file);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		const file = event.dataTransfer?.files[0];
		processFile(file);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragActive = true;
	}

	function handleDragLeave() {
		dragActive = false;
	}

	function processFile(file: File | undefined) {
		if (!file) return;

		// Validate file type
		const typePattern = acceptedTypes.replace('*', '.*');
		const regex = new RegExp(typePattern);
		if (!regex.test(file.type)) {
			onError?.('Invalid file type');
			return;
		}

		// Validate file size
		if (file.size > maxSizeBytes) {
			onError?.(`File size must be less than ${maxSizeMB}MB`);
			return;
		}

		if (file.size === 0) {
			onError?.('File is empty');
			return;
		}

		selectedFile = file;
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}

		// Only create preview for images
		if (file.type.startsWith('image/')) {
			previewUrl = URL.createObjectURL(file);
		} else {
			previewUrl = null;
		}
	}

	function clearFile() {
		if (uploading) return; // Prevent clearing during upload
		selectedFile = null;
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function startCooldown() {
		lastUploadTime = Date.now();
		cooldownRemaining = uploadCooldownMs;

		if (cooldownInterval) {
			clearInterval(cooldownInterval);
		}

		cooldownInterval = setInterval(() => {
			const elapsed = Date.now() - lastUploadTime;
			const remaining = Math.max(0, uploadCooldownMs - elapsed);
			cooldownRemaining = remaining;

			if (remaining === 0 && cooldownInterval) {
				clearInterval(cooldownInterval);
				cooldownInterval = null;
			}
		}, 100);
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
			if (cooldownInterval) {
				clearInterval(cooldownInterval);
			}
		};
	});
</script>

<form
	method="POST"
	{action}
	enctype="multipart/form-data"
	use:enhance={() => {
		uploading = true;
		startCooldown();
		return async ({ result, update }) => {
			uploading = false;

			if (result.type === 'success' && result.data) {
				const data = result.data as { url?: string; fileName?: string; key?: string };
				if (data.url && data.fileName && data.key) {
					onSuccess?.(data as { url: string; fileName: string; key: string });
					clearFile();
				}
			} else if (result.type === 'failure' && result.data) {
				const errorData = result.data as { error?: string };
				onError?.(errorData.error || 'Upload failed');
			}

			await update();
		};
	}}
	class="space-y-4"
>
	<!-- File Drop Zone -->
	<div class="form-control">
		<div
			class="relative"
			ondrop={handleDrop}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
		>
			<input
				bind:this={fileInput}
				id="file"
				name="file"
				type="file"
				accept={acceptedTypes}
				class="hidden"
				onchange={handleFileSelect}
				disabled={disabled || uploading}
				required
			/>

			<!-- Drop Zone / Preview Area -->
			<button
				type="button"
				onclick={() => fileInput?.click()}
				disabled={disabled || uploading}
				class="group relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200 active:scale-[0.98]"
				class:border-primary={dragActive}
				class:bg-primary-5={dragActive}
				class:border-base-300={!dragActive && !selectedFile}
				class:border-success={selectedFile && !dragActive}
				class:bg-success-5={selectedFile && !dragActive}
				class:hover:border-primary={!uploading && !disabled}
				class:hover:bg-base-200={!uploading && !disabled && !selectedFile}
				class:opacity-50={uploading || disabled}
			>
				{#if !selectedFile}
					<div class="flex min-h-[140px] flex-col items-center justify-center gap-2 p-4">
						<div class="rounded-full bg-base-200 p-3 transition-transform group-hover:scale-110">
							<IconImage class="h-8 w-8 text-base-content/40" />
						</div>
						<div class="text-center">
							<p class="text-sm font-semibold text-base-content">
								{#if dragActive}
									Drop file here
								{:else if uploading}
									Uploading...
								{:else if disabled}
									Upload disabled
								{:else}
									Tap to select
								{/if}
							</p>
							{#if !uploading && !disabled}
								<p class="mt-1 text-xs text-base-content/60">
									{acceptedTypes.replace('image/*', 'Images')} • {maxSizeMB}MB max
								</p>
							{/if}
						</div>
					</div>
				{:else}
					<!-- Preview with File Info -->
					<div class="flex gap-3 p-3">
						{#if previewUrl}
							<div class="shrink-0">
								<div class="h-24 w-24 overflow-hidden rounded-lg">
									<img src={previewUrl} alt="Preview" class="h-full w-full object-cover" />
								</div>
							</div>
						{:else}
							<div
								class="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-base-200"
							>
								<IconImage class="h-8 w-8 text-base-content/40" />
							</div>
						{/if}
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

	<!-- Submit Button -->
	<button type="submit" class="btn btn-block btn-primary" disabled={!canUpload || disabled}>
		{#if uploading}
			<span class="loading loading-spinner"></span>
			Uploading...
		{:else if cooldownRemaining > 0}
			<span class="loading loading-sm loading-spinner"></span>
			Wait {Math.ceil(cooldownRemaining / 1000)}s
		{:else}
			<IconCloudArrowUp class="h-5 w-5" />
			Upload
		{/if}
	</button>
</form>
