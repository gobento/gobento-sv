<!-- src/routes/(public)/about/+page.svelte -->
<script lang="ts">
	import FluentEmojiFlatBentoBox from '~icons/fluent-emoji-flat/bento-box';
	import FluentBook24Regular from '~icons/fluent/book-24-regular';
	import FluentShield24Regular from '~icons/fluent/shield-24-regular';
	import FluentMail24Regular from '~icons/fluent/mail-24-regular';
	import FluentInfo24Regular from '~icons/fluent/info-24-regular';
</script>

<svelte:head>
	<title>GoBento | About</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-4">
	<!-- Hero Section -->
	<div class="mb-12 text-center">
		<div class="mb-4 flex justify-center">
			<FluentEmojiFlatBentoBox class="h-20 w-20" />
		</div>
		<h1 class="mb-3 text-3xl font-bold text-white">About GoBento</h1>
		<p class="text-lg text-white/70">Fighting food waste, one bento at a time</p>
	</div>

	<!-- Info Cards Stack -->
	<div class="flex flex-col gap-6">
		<!-- What We Do Card -->
		<div class="card border border-white/20 bg-white/10 backdrop-blur-md">
			<div class="card-body">
				<div class="mb-3 flex items-center gap-3">
					<FluentInfo24Regular class="h-6 w-6 text-primary" />
					<h2 class="card-title text-white">What We Do</h2>
				</div>
				<p class="text-white/80">
					GoBento connects you with restaurants and stores that have surplus food at the end of the
					day. Save money while helping reduce food waste in your community.
				</p>
			</div>
		</div>

		<!-- Legal & Contact Links -->
		<div class="card border border-white/20 bg-white/10 backdrop-blur-md">
			<div class="card-body">
				<h2 class="mb-3 card-title text-white">Information & Support</h2>
				<div class="flex flex-col gap-3">
					<a
						href="/terms-of-service"
						class="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-white/10"
					>
						<FluentBook24Regular class="h-5 w-5 text-primary" />
						<span class="text-white">Terms of Service</span>
					</a>
					<a
						href="/privacy-policy"
						class="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-white/10"
					>
						<FluentShield24Regular class="h-5 w-5 text-primary" />
						<span class="text-white">Privacy Policy</span>
					</a>
					<a
						href="/contact"
						class="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-white/10"
					>
						<FluentMail24Regular class="h-5 w-5 text-primary" />
						<span class="text-white">Contact Us</span>
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Build Info Footer -->
	<div class="mt-8 text-center text-sm text-white/40">
		Build: {new Date().toLocaleString()}
	</div>
</div>
