<a href='google.co.ck' class='btn btn-primary'>Click me</a>

<script lang="ts">
	import type { User } from '$lib/server/schema';
	import type { PageData, ActionData } from './$types';
	interface Props {
		data: {
			user:User
			isAdmin: boolean;
			
		};
	}

	let { data }: Props = $props();
</script>

{#if data.user}
	<div class="card">
		<div class="card-body">
			<h2 class="card-title">
				{data.user.name}
			</h2>
			<p class="card-text">
				{data.user.email}
			</p>
		</div>
	</div>
{/if}