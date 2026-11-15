<!-- src/routes/(dock)/invite/[token]/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import IconTile from '#lib/components/ui/IconTile.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatPickupWindow } from '#lib/components/reservations/pickup.js';
	import IconPeople from '~icons/fluent/people-24-regular';
	import IconLinkDismiss from '~icons/fluent/link-dismiss-24-regular';
	import IconClock from '~icons/fluent/clock-dismiss-24-regular';
	import IconCheck from '~icons/fluent/checkmark-circle-24-regular';
	import IconDiscover from '~icons/fluent/compass-northwest-24-regular';

	let { data }: { data: PageData } = $props();

	const COPY = {
		taken: {
			icon: IconPeople,
			tone: 'warning',
			title: 'Someone else already accepted this invite',
			message:
				'Invite links work for one person only, and another account has already accepted this one. If the bag was meant for you, ask your friend to cancel that invite and send you a new link.'
		},
		revoked: {
			icon: IconLinkDismiss,
			tone: 'neutral',
			title: 'This invite link no longer works',
			message:
				'Your friend cancelled the invite or replaced it with a new link. Ask them to send you the current one.'
		},
		declined: {
			icon: IconLinkDismiss,
			tone: 'neutral',
			title: 'This invite was declined',
			message:
				'Someone declined this invite, so the link was closed. Ask your friend for a new link.'
		},
		expired: {
			icon: IconClock,
			tone: 'error',
			title: 'This invite has expired',
			message: 'The pickup window for this bag has passed, so the link can no longer be used.'
		},
		collected: {
			icon: IconCheck,
			tone: 'success',
			title: 'This bag has already been collected',
			message: 'Nothing left to pick up here — the bag was handed over already.'
		}
	} as const;

	const copy = $derived(COPY[data.problem]);
</script>

<svelte:head><title>Invite · GoBento</title></svelte:head>

<div class="page-narrow">
	<section class="surface mt-6 animate-rise-in p-6 text-center">
		<IconTile icon={copy.icon} tone={copy.tone} size="xl" class="mx-auto" />
		<h1 class="mt-4 text-2xl font-extrabold tracking-tight">{copy.title}</h1>
		<p class="mt-2 text-base-content/70">{copy.message}</p>

		{#if data.details}
			<div class="mt-5 rounded-2xl bg-base-200/60 p-4 text-sm">
				<p class="font-semibold">{data.details.offerName}</p>
				<p class="text-base-content/70">{data.details.businessName}</p>
				<p class="tabular text-base-content/60">
					{formatPickupWindow(data.details.pickupFrom, data.details.pickupUntil)}
				</p>
			</div>
		{/if}

		<div class="mt-6">
			<Button href="/discover" icon={IconDiscover} block>Find food nearby</Button>
		</div>
	</section>
</div>
