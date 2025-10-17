<script lang="ts">
	import type { User } from '$lib/server/schema';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();
</script>

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

<a href="/auth/logout" class="btn btn-secondary"> Logout </a>
