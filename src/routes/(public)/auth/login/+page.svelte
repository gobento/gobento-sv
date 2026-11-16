<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import Seo from '#lib/components/layout/Seo.svelte';
	import BentoBox from '~icons/fluent-emoji-flat/bento-box';
	import GoogleLogo from '~icons/logos/google-icon';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconLeaf from '~icons/fluent/leaf-two-24-regular';
	import IconShop from '~icons/fluent/building-shop-24-regular';
	import IconPerson from '~icons/fluent/person-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconShield from '~icons/fluent/shield-24-regular';
	import IconSettings from '~icons/fluent/settings-24-regular';
	import IconBeaker from '~icons/fluent/beaker-24-regular';
	import IconBuilding from '~icons/fluent/building-24-regular';
	import TelegramLogin from '#lib/components/account/TelegramLogin.svelte';
	import { PUBLIC_TELEGRAM_LOGIN_BOT } from '$app/env/public';
	import Spinner from '#lib/components/ui/Spinner.svelte';

	let { data }: { data: PageData } = $props();

	const googleHref = $derived(
		resolve(`/(public)/auth/login/google?next=${encodeURIComponent(data.next)}`)
	);

	const valueProps = [
		{ icon: IconTag, label: 'Great food for less', tone: 'bg-secondary/15 text-secondary' },
		{ icon: IconLeaf, label: 'Less food in the bin', tone: 'bg-accent/15 text-accent' },
		{ icon: IconShop, label: 'Support local shops', tone: 'bg-primary/10 text-primary' }
	];

	const demoRoles = [
		{ role: 'user', label: 'Customer', hint: 'Find and reserve food', icon: IconPerson },
		{ role: 'business', label: 'Business', hint: 'Publish surplus offers', icon: IconShop },
		{ role: 'charity', label: 'Charity', hint: 'Collect donations', icon: IconHeart },
		{ role: 'moderator', label: 'Moderator', hint: 'Review accounts', icon: IconShield },
		{ role: 'admin', label: 'Admin', hint: 'Run the platform', icon: IconSettings },
		{ role: 'staff', label: 'Shop staff', hint: 'Pack and hand over', icon: IconShop },
		{ role: 'charityStaff', label: 'Charity staff', hint: 'Collect pickups', icon: IconHeart }
	];

	// Leaving for Google takes a moment; show that the tap registered.
	let leaving = $state(false);
</script>

<svelte:window onpageshow={() => (leaving = false)} />

<Seo title="Sign in · GoBento" description="Sign in to GoBento and rescue surplus food near you." />

<div class="mx-auto flex w-full max-w-sm flex-col items-center text-center">
	<div class="animate-pop-in">
		<div
			class="flex size-24 animate-float items-center justify-center rounded-[2rem] bg-base-100 shadow-lift"
		>
			<BentoBox class="size-16" />
		</div>
	</div>

	<h1 class="mt-6 animate-rise-in text-4xl font-extrabold tracking-tight">GoBento</h1>
	<p class="mt-2 animate-rise-in text-lg text-base-content/70 stagger" style:--i={1}>
		Rescue delicious surplus food near you, one bento at a time.
	</p>

	<ul class="mt-7 grid w-full grid-cols-3 gap-2">
		{#each valueProps as prop, i (prop.label)}
			{@const Icon = prop.icon}
			<li class="flex animate-rise-in flex-col items-center gap-2 stagger" style:--i={i + 2}>
				<span class="flex size-11 items-center justify-center rounded-2xl {prop.tone}">
					<Icon class="size-5" />
				</span>
				<span class="text-xs leading-tight font-bold text-base-content/70">{prop.label}</span>
			</li>
		{/each}
	</ul>

	<div class="mt-8 w-full animate-rise-in stagger" style:--i={5}>
		<a
			href={googleHref}
			data-sveltekit-reload
			onclick={() => (leaving = true)}
			class="btn h-14 btn-block gap-3 rounded-2xl border-base-300 bg-base-100 text-base font-bold text-base-content shadow-soft transition-[transform,box-shadow] duration-200 ease-spring hover:shadow-lift active:scale-[0.97]"
		>
			{#if leaving}
				<Spinner size="sm" />
			{:else}
				<GoogleLogo class="size-5" />
			{/if}
			Continue with Google
		</a>

		{#if PUBLIC_TELEGRAM_LOGIN_BOT}
			<div class="mt-3">
				<TelegramLogin
					bot={PUBLIC_TELEGRAM_LOGIN_BOT}
					authUrl="/auth/callback/telegram?next={encodeURIComponent(data.next)}"
				/>
			</div>
		{/if}
		{#if data.error}
			<p class="mt-3 rounded-xl bg-error/10 p-3 text-sm text-error" role="alert">{data.error}</p>
		{/if}

		<a
			href="/auth/sso?next={encodeURIComponent(data.next)}"
			class="btn mt-2 btn-block gap-2 rounded-2xl btn-ghost text-sm font-semibold text-base-content/70"
		>
			<IconBuilding class="size-4" />
			Company sign-in (SSO)
		</a>

		<p class="mt-4 text-xs text-base-content/60">
			By continuing you agree to our
			<a
				class="link font-semibold text-base-content/80 link-hover"
				href={resolve('/(public)/terms-of-service')}>terms of service</a
			>
			and
			<a
				class="link font-semibold text-base-content/80 link-hover"
				href={resolve('/(public)/privacy-policy')}>privacy policy</a
			>.
		</p>
	</div>

	{#if data.demoAccounts}
		<section
			class="surface mt-8 w-full animate-rise-in p-4 text-start stagger"
			style:--i={6}
			aria-labelledby="demo-heading"
		>
			<div class="flex items-center gap-2">
				<IconBeaker class="size-4 text-secondary" />
				<h2 id="demo-heading" class="eyebrow">Demo accounts</h2>
			</div>
			<p class="mt-1 text-sm text-base-content/60">
				This is a demo with sample data. Pick a role to look around.
			</p>
			<ul class="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
				{#each demoRoles as demo (demo.role)}
					{@const Icon = demo.icon}
					<li class="last:odd:col-span-full">
						<a
							href={resolve(
								`/(public)/auth/login/demo?as=${demo.role}&next=${encodeURIComponent(data.next)}`
							)}
							data-sveltekit-reload
							class="pressable flex min-h-14 items-center gap-3 rounded-2xl bg-base-200/60 px-3 py-2 hover:bg-primary/10"
						>
							<span
								class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-base-100 text-primary"
							>
								<Icon class="size-5" />
							</span>
							<span class="min-w-0">
								<span class="block text-sm font-bold">{demo.label}</span>
								<span class="block truncate text-xs text-base-content/60">{demo.hint}</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<nav class="mt-8 flex gap-5 text-sm font-semibold text-base-content/60" aria-label="More">
		<a class="hover:text-base-content" href={resolve('/(public)/about')}>About</a>
		<a class="hover:text-base-content" href={resolve('/(public)/contact')}>Contact</a>
	</nav>
</div>
