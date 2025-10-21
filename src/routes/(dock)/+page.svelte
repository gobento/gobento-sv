<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { page } from '$app/state';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();
</script>

DISCOVER

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<a href="/test">Test upload</a>
