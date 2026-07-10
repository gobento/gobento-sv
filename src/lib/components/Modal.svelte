<!-- /src/lib/components/Modal.svelte -->
<script lang="ts">
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';

	let {
		open = $bindable(false),
		title = '',
		onBack = null,
		size = 'default',
		position = 'center',
		children
	}: {
		open: boolean;
		title?: string;
		onBack?: (() => void) | null;
		size?: 'default' | 'small' | 'large';
		position?: 'center' | 'bottom';
		children: any;
	} = $props();

	const sizeClasses = {
		small: 'max-w-sm',
		default: 'max-w-lg',
		large: 'max-w-2xl'
	};

	function handleClose() {
		open = false;
	}

	function handleBackdropClick() {
		handleClose();
	}
</script>

{#if open}
	<div class="modal-open modal z-1003" class:modal-bottom={position === 'bottom'}>
		<div
			class="modal-box {sizeClasses[size]} {position === 'bottom'
				? 'w-full rounded-t-2xl rounded-b-none sm:mx-auto'
				: 'rounded-lg'}"
		>
			{#if position === 'bottom'}
				<!-- Drag handle -->
				<div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-base-content/20"></div>
			{/if}

			<!-- Header with back button (optional) and close button -->
			<div class="mb-6 flex items-center justify-between">
				<div class="flex items-center gap-2">
					{#if onBack}
						<button onclick={onBack} class="btn btn-circle btn-ghost btn-sm" aria-label="Go back">
							<IconArrowLeft class="size-5" />
						</button>
					{/if}
					{#if title}
						<h3 class="text-xl font-bold">{title}</h3>
					{/if}
				</div>
				<button onclick={handleClose} class="btn btn-circle btn-ghost btn-sm" aria-label="Close">
					<IconDismiss class="size-5" />
				</button>
			</div>

			<!-- Modal content -->
			<div class="modal-content">
				{@render children()}
			</div>
		</div>
		<div class="modal-backdrop" onclick={handleBackdropClick}></div>
	</div>
{/if}
