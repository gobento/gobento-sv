<script lang="ts">
	import IconQuestionCircle from '~icons/fluent/question-circle-24-regular';

	interface Props {
		title?: string;
		children: any;
	}

	let { title = 'Need help?', children }: Props = $props();
</script>

<details class="collapse-arrow collapse">
	<summary class="collapse-title min-h-0 text-sm font-medium">
		<span class="flex items-center gap-2">
			<IconQuestionCircle class="size-4 text-secondary" />
			{title}
		</span>
	</summary>
	<div class="collapse-content">
		{@render children()}
	</div>
</details>
