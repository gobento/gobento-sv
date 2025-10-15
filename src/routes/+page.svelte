<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { page } from '$app/state';

	interface Props {
		data: PageData;
		form: ActionData;
	}

		let { data, form }: Props = $props();
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

{#if data.session && data.user}
			<a href="/auth/logout" class="btn btn-ghost btn-sm"> Logout </a>
		{/if}

		{#if !data.session || !data.user}
			<a href="/auth/login" class="btn btn-ghost btn-sm"> Login </a>
		{/if}

		{#if data.session && data.user}
			<a href="/pending" class="btn btn-ghost btn-sm">
				{#if data.session && data.user && data.user.isAdmin}
					Pending changes
				{:else}
					My pending changes
				{/if}
			</a>
		{/if}