<!--
	Image/file picker with drag and drop and a preview.

	Two ways to use it:
	- as a field inside your own form: pass `name` (the file is submitted with that form);
	- standalone: omit `name` and it posts the file to `action` by itself.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconCloudArrowUp from '~icons/fluent/cloud-arrow-up-24-regular';
	import IconImage from '~icons/fluent/image-add-24-regular';
	import IconDocument from '~icons/fluent/document-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconAlert from '~icons/fluent/error-circle-24-regular';
	import Button from '#lib/components/ui/Button.svelte';

	interface UploadResult {
		url: string;
		fileName: string;
		key: string;
	}

	interface Props {
		/** Field mode: name of the file input inside the surrounding form. */
		name?: string;
		id?: string;
		/** Standalone mode: form action the file is posted to. */
		action?: string;
		maxSizeBytes?: number;
		acceptedTypes?: string;
		disabled?: boolean;
		required?: boolean;
		/** Field mode: the currently selected file (read it, or set to null to clear). */
		file?: File | null;
		/** Field mode: image already stored on the server, shown until a new one is picked. */
		currentUrl?: string | null;
		/** Prompt in the empty drop zone. */
		label?: string;
		/** Field mode: validation message from the form. */
		error?: string | null;
		onSuccess?: (data: UploadResult) => void;
		onError?: (error: string) => void;
		uploadCooldownMs?: number;
	}

	let {
		name,
		id = name ?? 'file',
		action = '?/upload',
		maxSizeBytes = 5 * 1024 * 1024,
		acceptedTypes = 'image/*',
		disabled = false,
		required = false,
		file = $bindable(null),
		currentUrl = null,
		label = 'Choose an image',
		error = null,
		onSuccess,
		onError,
		uploadCooldownMs = 2000
	}: Props = $props();

	let uploading = $state(false);
	let dragActive = $state(false);
	let previewUrl = $state<string | null>(null);
	let localError = $state<string | null>(null);
	let cooldownRemaining = $state(0);
	let cooldownTimer: ReturnType<typeof setInterval> | null = null;
	let fileInput = $state<HTMLInputElement>();

	const isField = $derived(name !== undefined);
	const maxSizeMB = $derived(Math.round((maxSizeBytes / (1024 * 1024)) * 10) / 10);
	const locked = $derived(disabled || uploading);
	const shownError = $derived(localError ?? error);
	const shownImage = $derived(previewUrl ?? (file ? null : currentUrl));
	const canUpload = $derived(!locked && file !== null && cooldownRemaining === 0);
	const typeHint = $derived(acceptedTypes === 'image/*' ? 'PNG, JPG or WebP' : acceptedTypes);

	function matchesAccepted(type: string): boolean {
		return acceptedTypes.split(',').some((raw) => {
			const pattern = raw.trim();
			if (!pattern || pattern === '*/*') return true;
			if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1));
			return type === pattern;
		});
	}

	function reject(message: string) {
		localError = message;
		onError?.(message);
		if (fileInput) fileInput.value = '';
		setFile(null);
	}

	function setFile(next: File | null) {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = next?.type.startsWith('image/') ? URL.createObjectURL(next) : null;
		file = next;
	}

	function processFile(candidate: File | undefined) {
		if (!candidate) return;
		if (!matchesAccepted(candidate.type)) return reject('This file type is not supported');
		if (candidate.size === 0) return reject('This file is empty');
		if (candidate.size > maxSizeBytes) return reject(`The file must be smaller than ${maxSizeMB} MB`);

		localError = null;
		setFile(candidate);
	}

	function handleFileSelect(event: Event) {
		processFile((event.currentTarget as HTMLInputElement).files?.[0]);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		if (locked || !event.dataTransfer?.files.length) return;
		// Put the dropped file into the real input so it is submitted with the form.
		if (fileInput) fileInput.files = event.dataTransfer.files;
		processFile(event.dataTransfer.files[0]);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (!locked) dragActive = true;
	}

	function clearFile() {
		if (uploading) return;
		localError = null;
		if (fileInput) fileInput.value = '';
		setFile(null);
	}

	function formatSize(bytes: number): string {
		return bytes >= 1024 * 1024
			? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
			: `${Math.max(1, Math.round(bytes / 1024))} KB`;
	}

	function startCooldown() {
		const startedAt = Date.now();
		cooldownRemaining = uploadCooldownMs;
		if (cooldownTimer) clearInterval(cooldownTimer);

		cooldownTimer = setInterval(() => {
			cooldownRemaining = Math.max(0, uploadCooldownMs - (Date.now() - startedAt));
			if (cooldownRemaining === 0 && cooldownTimer) {
				clearInterval(cooldownTimer);
				cooldownTimer = null;
			}
		}, 100);
	}

	// A parent clearing `file` (e.g. after a reset) must also empty the input and preview.
	$effect(() => {
		if (file === null && previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
			if (fileInput) fileInput.value = '';
		}
	});

	$effect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			if (cooldownTimer) clearInterval(cooldownTimer);
		};
	});
</script>

{#snippet picker()}
	<div>
		<input
			bind:this={fileInput}
			{id}
			name={name ?? 'file'}
			type="file"
			accept={acceptedTypes}
			class="sr-only"
			tabindex="-1"
			onchange={handleFileSelect}
			disabled={locked}
			required={required && !currentUrl}
			aria-invalid={shownError ? 'true' : undefined}
		/>

		<div
			role="group"
			aria-label={label}
			ondrop={handleDrop}
			ondragover={handleDragOver}
			ondragleave={() => (dragActive = false)}
			class={[
				'rounded-2xl border-2 border-dashed transition-[border-color,background-color] duration-200',
				dragActive
					? 'border-primary bg-primary/8'
					: shownError
						? 'border-error/60 bg-error/5'
						: file || shownImage
							? 'border-base-300 bg-base-200/60'
							: 'border-base-300 bg-base-200/40',
				locked && 'opacity-60'
			]}
		>
			{#if file || shownImage}
				<div class="flex items-center gap-3.5 p-3">
					<div
						class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-base-100"
					>
						{#if shownImage}
							<img
								src={shownImage}
								alt=""
								class="size-full animate-fade-in object-cover"
								decoding="async"
							/>
						{:else}
							<IconDocument class="size-8 text-base-content/40" />
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						{#if file}
							<p class="truncate text-sm font-bold" title={file.name}>{file.name}</p>
							<p class="tabular text-xs text-base-content/60">{formatSize(file.size)}</p>
						{:else}
							<p class="text-sm font-bold">Current image</p>
							<p class="text-xs text-base-content/60">{typeHint}, up to {maxSizeMB} MB</p>
						{/if}
						<div class="mt-2 flex flex-wrap gap-2">
							<button
								type="button"
								class="btn btn-outline btn-sm"
								onclick={() => fileInput?.click()}
								disabled={locked}
							>
								{file ? 'Change' : 'Replace'}
							</button>
							{#if file}
								<button
									type="button"
									class="btn gap-1 btn-ghost btn-sm"
									onclick={clearFile}
									disabled={locked}
								>
									<IconDismiss class="size-4" />
									Remove
								</button>
							{/if}
						</div>
					</div>
				</div>
			{:else}
				<button
					type="button"
					onclick={() => fileInput?.click()}
					disabled={locked}
					class="group flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center"
				>
					<span
						class="flex size-12 items-center justify-center rounded-2xl bg-base-100 text-primary shadow-soft transition-transform duration-200 ease-spring group-hover:scale-110"
					>
						<IconImage class="size-6" />
					</span>
					<span class="text-sm font-bold">
						{#if dragActive}Drop it here{:else}{label}{/if}
					</span>
					<span class="text-xs text-base-content/60">{typeHint}, up to {maxSizeMB} MB</span>
				</button>
			{/if}
		</div>

		{#if shownError}
			<p
				class="mt-1.5 flex animate-rise-in items-center gap-1 text-xs font-semibold text-error"
				role="alert"
			>
				<IconAlert class="size-3.5 shrink-0" />
				{shownError}
			</p>
		{/if}
	</div>
{/snippet}

{#if isField}
	{@render picker()}
{:else}
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
					const data = result.data as Partial<UploadResult>;
					if (data.url && data.fileName && data.key) {
						onSuccess?.(data as UploadResult);
						clearFile();
					}
				} else if (result.type === 'failure') {
					const message = (result.data as { error?: string } | undefined)?.error;
					onError?.(message || 'Upload failed');
				} else if (result.type === 'error') {
					onError?.('Upload failed');
				}

				await update();
			};
		}}
		class="space-y-3"
	>
		{@render picker()}

		<Button
			type="submit"
			block
			icon={IconCloudArrowUp}
			loading={uploading}
			loadingLabel="Uploading…"
			disabled={!canUpload}
		>
			{#if cooldownRemaining > 0}
				Wait {Math.ceil(cooldownRemaining / 1000)}s
			{:else}
				Upload
			{/if}
		</Button>
	</form>
{/if}
