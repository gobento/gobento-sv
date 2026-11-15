<!-- src/routes/(public)/auth/sso/+page.svelte -->
<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import Button from '#lib/components/ui/Button.svelte';
	import IconTile from '#lib/components/ui/IconTile.svelte';
	import IconBuilding from '~icons/fluent/building-24-regular';
	import IconBack from '~icons/fluent/arrow-left-24-regular';
	import IconInfo from '~icons/fluent/info-24-regular';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let sending = $state(false);
	const error = $derived(form?.error ?? data.error);
</script>

<svelte:head><title>Company sign-in · GoBento</title></svelte:head>

<div class="flex min-h-dvh items-center justify-center px-4 py-10">
	<div class="w-full max-w-sm">
		<IconTile icon={IconBuilding} size="xl" class="mx-auto" />
		<h1 class="mt-4 text-center text-2xl font-extrabold tracking-tight">Company sign-in</h1>
		<p class="mt-1 text-center text-sm text-base-content/70">
			For staff whose team signs in with their company account (Microsoft, Okta, Google
			Workspace and others).
		</p>

		<!-- A plain POST: the answer is a redirect to the company's provider, which
		     client-side form handling can't follow. -->
		<form method="POST" class="mt-6 space-y-3" onsubmit={() => (sending = true)}>
			<input type="hidden" name="next" value={data.next} />
			<label class="block">
				<span class="mb-1 block text-sm font-medium">Work email</span>
				<input
					name="email"
					type="email"
					autocomplete="email"
					class="input-bordered input w-full"
					value={form?.email ?? ''}
					required
				/>
			</label>
			{#if error}
				<div class="alert alert-error text-sm">
					<IconInfo class="size-5 shrink-0" /><span>{error}</span>
				</div>
			{/if}
			<Button type="submit" block loading={sending}>Continue</Button>
		</form>

		<a href="/auth/login?next={encodeURIComponent(data.next)}" class="btn mt-3 btn-block gap-2 btn-ghost">
			<IconBack class="size-4" /> Other ways to sign in
		</a>
	</div>
</div>
