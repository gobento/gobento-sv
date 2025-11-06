<script lang="ts">
	import IconAlertTriangle from '~icons/lucide/alert-triangle';
	import IconAlertCircle from '~icons/lucide/alert-circle';
	import IconInfo from '~icons/lucide/info';
	import IconCheckCircle from '~icons/lucide/check-circle';

	interface Props {
		type?: 'warn' | 'error' | 'info' | 'success';
		class?: string;
		children: Snippet;
	}

	let { type = 'info', class: className = '', children }: Props = $props();

	const config = {
		warn: {
			icon: IconAlertTriangle,
			borderColor: 'border-warning',
			bgColor: 'bg-warning/10',
			textColor: 'text-warning'
		},
		error: {
			icon: IconAlertCircle,
			borderColor: 'border-error',
			bgColor: 'bg-error/10',
			textColor: 'text-error'
		},
		info: {
			icon: IconInfo,
			borderColor: 'border-info',
			bgColor: 'bg-info/10',
			textColor: 'text-info'
		},
		success: {
			icon: IconCheckCircle,
			borderColor: 'border-success',
			bgColor: 'bg-success/10',
			textColor: 'text-success'
		}
	};

	const currentConfig = $derived(config[type]);
</script>

<div
	class="rounded-xl border-l-4 {currentConfig.borderColor} {currentConfig.bgColor} p-4 {className}"
>
	<div class="flex items-start gap-3">
		<svelte:component
			this={currentConfig.icon}
			class="mt-0.5 size-5 shrink-0 {currentConfig.textColor}"
		/>
		<div class="text-sm {currentConfig.textColor}">
			{@render children()}
		</div>
	</div>
</div>
