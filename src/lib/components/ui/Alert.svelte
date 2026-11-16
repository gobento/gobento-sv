<!-- src/lib/components/Alert.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconWarning from '~icons/fluent/warning-24-filled';
	import IconError from '~icons/fluent/error-circle-24-filled';
	import IconInfo from '~icons/fluent/info-24-filled';
	import IconSuccess from '~icons/fluent/checkmark-circle-24-filled';

	interface Props {
		type?: 'warn' | 'error' | 'info' | 'success';
		class?: string;
		children: Snippet;
	}

	let { type = 'info', class: className = '', children }: Props = $props();

	const CONFIG = {
		warn: { icon: IconWarning, surface: 'bg-warning/12 border-warning/30', tone: 'text-warning' },
		error: { icon: IconError, surface: 'bg-error/10 border-error/25', tone: 'text-error' },
		info: { icon: IconInfo, surface: 'bg-info/10 border-info/25', tone: 'text-info' },
		success: { icon: IconSuccess, surface: 'bg-success/10 border-success/25', tone: 'text-success' }
	};

	const config = $derived(CONFIG[type]);
	const Icon = $derived(config.icon);
</script>

<div
	class="flex items-start gap-3 rounded-2xl border p-4 {config.surface} {className}"
	role={type === 'error' ? 'alert' : 'status'}
>
	<Icon class="mt-0.5 size-5 shrink-0 {config.tone}" />
	<div class="min-w-0 text-sm text-base-content/85">
		{@render children()}
	</div>
</div>
