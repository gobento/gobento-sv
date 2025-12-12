<!-- Page component (src/routes/auth/login/+page.svelte) -->
<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import FluentEmojiFlatBentoBox from '~icons/fluent-emoji-flat/bento-box';
	import LogosGoogleIcon from '~icons/logos/google-icon';
</script>

<svelte:head>
	<title>Login - Go Bento</title>
	<meta name="description" content="Login to access Go Bento features" />
</svelte:head>

<!-- Header -->
<header class="mb-6 text-center">
	<div class="mb-3 flex justify-center">
		<FluentEmojiFlatBentoBox class="h-12 w-12" />
	</div>
	<h1 class="text-2xl font-bold text-white">Go Bento</h1>
	<p class="mt-2 text-base text-white/70">Sign in to continue</p>
</header>

<!-- Login Card -->
<div class="card border border-white/30 bg-white/10 backdrop-blur-md">
	<div class="card-body gap-4 p-6">
		<a
			class="btn border-[#e5e5e5] bg-white text-black"
			href={`/auth/login/google?next=${encodeURIComponent(page.url.searchParams.get('next') || '/')}`}
		>
			<LogosGoogleIcon class="h-5 w-5" />
			Continue with Google
		</a>

		<div class="text-center text-xs text-white/60">
			By signing in, you agree to our
			<a class="link link-primary" href={resolve('/terms-of-service')}>Terms of Service</a>
			and
			<a class="link link-primary" href={resolve('/privacy-policy')}>Privacy Policy</a>.
		</div>
	</div>
</div>
