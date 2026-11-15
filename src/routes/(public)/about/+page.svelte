<script lang="ts">
	import PublicPage from '#lib/components/account/PublicPage.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import BentoBox from '~icons/fluent-emoji-flat/bento-box';
	import IconBook from '~icons/fluent/book-24-regular';
	import IconShield from '~icons/fluent/shield-24-regular';
	import IconMail from '~icons/fluent/mail-24-regular';
	import IconChevron from '~icons/fluent/chevron-right-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconBag from '~icons/fluent/shopping-bag-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';

	const steps = [
		{
			icon: IconSearch,
			tone: 'bg-primary/10 text-primary',
			title: 'Discover',
			text: 'Bakeries, restaurants and shops near you list what is left at the end of the day.'
		},
		{
			icon: IconBag,
			tone: 'bg-secondary/15 text-secondary',
			title: 'Reserve and collect',
			text: 'Reserve a bento at a reduced price and pick it up in the pickup window.'
		},
		{
			icon: IconHeart,
			tone: 'bg-accent/15 text-accent',
			title: 'Share the rest',
			text: 'What is not sold can be donated to verified local charities.'
		}
	];

	const links = [
		{ href: '/terms-of-service', label: 'Terms of service', icon: IconBook },
		{ href: '/privacy-policy', label: 'Privacy policy', icon: IconShield },
		{ href: '/contact', label: 'Contact us', icon: IconMail }
	];
</script>

<Seo title="About · GoBento" description="GoBento fights food waste, one bento at a time." />

<PublicPage title="About GoBento" description="Fighting food waste, one bento at a time.">
	<div class="space-y-6">
		<section class="surface flex items-center gap-4 p-5">
			<div
				class="flex size-16 shrink-0 animate-float items-center justify-center rounded-3xl bg-primary/10"
			>
				<BentoBox class="size-10" />
			</div>
			<p class="text-base-content/75">
				Good food should be eaten, not thrown away. GoBento connects people with shops and
				restaurants that have surplus food, so you save money and they waste less.
			</p>
		</section>

		<section aria-labelledby="how-heading">
			<h2 id="how-heading" class="eyebrow mb-2 px-1">How it works</h2>
			<ol class="surface divide-y divide-base-300/70">
				{#each steps as step, i (step.title)}
					{@const Icon = step.icon}
					<li class="stagger flex animate-rise-in items-start gap-3.5 p-4" style:--i={i}>
						<span class="flex size-10 shrink-0 items-center justify-center rounded-xl {step.tone}">
							<Icon class="size-5" />
						</span>
						<div>
							<h3 class="font-bold">{step.title}</h3>
							<p class="text-sm text-base-content/65">{step.text}</p>
						</div>
					</li>
				{/each}
			</ol>
		</section>

		<section aria-labelledby="info-heading">
			<h2 id="info-heading" class="eyebrow mb-2 px-1">Information and support</h2>
			<ul class="surface divide-y divide-base-300/70 overflow-hidden">
				{#each links as link (link.href)}
					{@const Icon = link.icon}
					<li>
						<a
							href={link.href}
							class="flex min-h-14 items-center gap-3.5 px-4 py-3 font-semibold transition-colors hover:bg-base-200/70"
						>
							<Icon class="size-5 text-primary" />
							<span class="flex-1">{link.label}</span>
							<IconChevron class="size-5 text-base-content/35 rtl:rotate-180" />
						</a>
					</li>
				{/each}
			</ul>
		</section>
	</div>
</PublicPage>
