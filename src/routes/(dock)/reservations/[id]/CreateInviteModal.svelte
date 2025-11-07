<!-- /src/lib/components/CreateInviteModal.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';

	import IconCheckmark from '~icons/fluent/checkmark-circle-24-filled';
	import IconShare from '~icons/fluent/share-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconLink from '~icons/fluent/link-24-regular';

	import Modal from '$lib/components/Modal.svelte';
	import Alert from '$lib/components/Alert.svelte';

	let {
		open = $bindable(false),
		inviteLoading,
		linkCopied,
		form = null,
		canShare,
		inviteLink,
		copyInviteLink,
		shareInviteLink
	}: {
		open: boolean;
		inviteLoading: boolean;
		linkCopied: boolean;
		inviteLink?: string;
		canShare: boolean;
		form?: any;
		copyInviteLink: () => void;
		shareInviteLink: () => void;
	} = $props();
</script>

<Modal bind:open title="Invite to Collection">
	{#if form?.error}
		<Alert type="error" class="mb-4">
			{form.error}
		</Alert>
	{/if}

	{#if inviteLink}
		<Alert type="success" class="mb-4">Invite link created!</Alert>

		<div class="mb-6">
			<label class="mb-2 block font-medium">Share this link</label>
			<div class="flex gap-2">
				<input
					type="text"
					value={inviteLink}
					readonly
					class="input-bordered input flex-1 rounded-xl font-mono text-xs"
				/>
				<button onclick={copyInviteLink} class="btn btn-square rounded-xl">
					<IconCopy class="size-5" />
				</button>
			</div>
			{#if linkCopied}
				<p class="mt-2 text-sm text-success">Link copied to clipboard!</p>
			{/if}
		</div>

		{#if canShare}
			<button onclick={shareInviteLink} class="btn mb-4 btn-block gap-2 btn-primary">
				<IconShare class="size-5" />
				Share via...
			</button>
		{/if}
	{:else}
		<p class="mb-6 text-sm text-base-content/60">
			Create a shareable link that allows one person to collect this food reservation on your
			behalf.
		</p>

		<Alert type="warn" class="mb-6">
			Only one person can use this invite. Once accepted, they'll be able to collect the food.
		</Alert>

		<form
			method="POST"
			action="?/createInvite"
			use:enhance={() => {
				inviteLoading = true;
				return async ({ update }) => {
					await update();
					inviteLoading = false;
				};
			}}
		>
			<button type="submit" class="btn flex-1 gap-2 btn-primary" disabled={inviteLoading}>
				{#if inviteLoading}
					<span class="loading loading-spinner"></span>
				{:else}
					<IconLink class="size-5" />
				{/if}
				Create Link
			</button>
		</form>
	{/if}
</Modal>
