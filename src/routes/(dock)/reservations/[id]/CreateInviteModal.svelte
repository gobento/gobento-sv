<!-- Lets the owner hand a pickup over to a friend through a one-time link. -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconShare from '~icons/fluent/share-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconCheck from '~icons/fluent/checkmark-24-filled';
	import IconLink from '~icons/fluent/link-24-regular';
	import Modal from '#lib/components/Modal.svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { toast } from '#lib/components/ui/toast.svelte';

	interface Props {
		open: boolean;
		/** Link of the pending invite, once one exists. */
		inviteLink: string | null;
		offerName: string;
		businessName: string;
	}

	let { open = $bindable(false), inviteLink, offerName, businessName }: Props = $props();

	let creating = $state(false);
	let errorMessage = $state('');
	let copied = $state(false);
	let canShare = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		canShare = typeof navigator.share === 'function';
		return () => clearTimeout(copyTimer);
	});

	async function copyLink() {
		if (!inviteLink) return;
		try {
			await navigator.clipboard.writeText(inviteLink);
			copied = true;
			navigator.vibrate?.(20);
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 2000);
		} catch {
			toast.error('Could not copy. Select the link and copy it manually.');
		}
	}

	async function shareLink() {
		if (!inviteLink) return;
		try {
			await navigator.share({
				title: `Collect ${offerName}`,
				text: `Could you pick up my ${offerName} at ${businessName}?`,
				url: inviteLink
			});
		} catch (err) {
			// Closing the share sheet rejects with AbortError; that is not a failure.
			if (!(err instanceof DOMException && err.name === 'AbortError')) {
				toast.error('Sharing failed. Copy the link instead.');
			}
		}
	}
</script>

<Modal bind:open title="Pass to a friend" position="bottom">
	<div class="space-y-4">
		{#if inviteLink}
			<p class="text-sm text-base-content/70">
				Send this link to the person who should collect your bag. It works for one person and
				expires when the pickup window closes.
			</p>

			<div class="rounded-2xl bg-base-200/60 p-4">
				<p class="font-mono text-xs break-all select-all" dir="ltr">{inviteLink}</p>
			</div>

			<div class="grid gap-2 {canShare ? 'grid-cols-2' : ''}">
				<Button
					variant={copied ? 'success' : canShare ? 'neutral' : 'primary'}
					outline={canShare && !copied}
					icon={copied ? IconCheck : IconCopy}
					onclick={copyLink}
				>
					{copied ? 'Copied' : 'Copy link'}
				</Button>
				{#if canShare}
					<Button icon={IconShare} onclick={shareLink}>Share</Button>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-base-content/70">
				Can't make it in time? Create a link that lets one other person collect this bag for you.
			</p>

			<Alert type="info">
				Once your friend accepts, the pickup is theirs. You can cancel the invite to take it back.
			</Alert>

			{#if errorMessage}
				<Alert type="error">{errorMessage}</Alert>
			{/if}

			<form
				method="POST"
				action="?/createInvite"
				use:enhance={() => {
					creating = true;
					errorMessage = '';
					return async ({ result, update }) => {
						await update({ reset: false });
						creating = false;
						if (result.type === 'failure') {
							errorMessage =
								typeof result.data?.error === 'string'
									? result.data.error
									: 'Could not create the invite.';
						} else if (result.type === 'error') {
							errorMessage = 'Could not create the invite. Please try again.';
						}
					};
				}}
			>
				<Button type="submit" block icon={IconLink} loading={creating} loadingLabel="Creating…">
					Create invite link
				</Button>
			</form>
		{/if}
	</div>
</Modal>
