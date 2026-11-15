<script lang="ts">
	import { page } from '$app/state';
	import PublicPage from '#lib/components/account/PublicPage.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import CopyField from '#lib/components/account/CopyField.svelte';
	import Alert from '#lib/components/Alert.svelte';
	import IconSend from '~icons/fluent/send-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconBag from '~icons/fluent/shopping-bag-24-regular';
	import IconShield from '~icons/fluent/shield-24-regular';
	import { supportUrl } from '#lib/support.js';

	const errorId = $derived(page.url.searchParams.get('errorId'));

	const tips = [
		{
			icon: IconBag,
			title: 'Problem with an order?',
			text: 'Tell us the pickup location and time, or report it straight from the reservation.'
		},
		{
			icon: IconShield,
			title: 'Verification or account question?',
			text: 'Include the name of your business or charity so we can find it.'
		},
		{
			icon: IconClock,
			title: 'When will we reply?',
			text: 'We usually answer within one or two working days.'
		}
	];
</script>

<Seo title="Contact · GoBento" description="Get in touch with the GoBento team." />

<PublicPage
	title="Contact us"
	description="Questions, feedback or a problem? We are happy to help."
>
	<div class="space-y-6">
		{#if errorId}
			<Alert type="warn">
				<p class="font-bold">Reporting an error</p>
				<CopyField value={errorId} label="Error reference" class="mt-3" />
			</Alert>
		{/if}

		<section class="surface p-5">
			<h2 class="text-lg font-extrabold tracking-tight">Message the team</h2>
			<p class="mt-1 text-sm text-base-content/65">
				{errorId
					? 'Opens our support bot on Telegram with the error reference attached.'
					: 'Opens our support bot on Telegram.'}
			</p>
			<a
				href={supportUrl(errorId)}
				target="_blank"
				rel="external noopener noreferrer"
				class="btn mt-4 btn-block gap-2 font-bold shadow-glow btn-primary"
			>
				<IconSend class="size-5" />
				Open Telegram chat
			</a>
		</section>

		<section aria-labelledby="tips-heading">
			<h2 id="tips-heading" class="eyebrow mb-2 px-1">Good to know</h2>
			<ul class="surface divide-y divide-base-300/70">
				{#each tips as tip (tip.title)}
					{@const Icon = tip.icon}
					<li class="flex items-start gap-3.5 p-4">
						<span
							class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
						>
							<Icon class="size-5" />
						</span>
						<div>
							<h3 class="font-bold">{tip.title}</h3>
							<p class="text-sm text-base-content/65">{tip.text}</p>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	</div>
</PublicPage>
