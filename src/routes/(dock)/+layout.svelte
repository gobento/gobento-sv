<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import HomeIcon from '~icons/mdi/home';
	import HomeFilledIcon from '~icons/mdi/home-variant';
	import InboxIcon from '~icons/mdi/inbox';
	import InboxFilledIcon from '~icons/mdi/inbox-full';
	import AccountIcon from '~icons/mdi/account';
	import AccountFilledIcon from '~icons/mdi/account-circle';

	let { children } = $props();

	// Derive active states from current path
	const isHome = $derived($page.url.pathname === '/');
	const isInbox = $derived($page.url.pathname === '/inbox');
	const isProfile = $derived($page.url.pathname === '/user');

	function goToHome() {
		goto('/');
	}

	function goToInbox() {
		goto('/inbox');
	}

	function goToProfile() {
		goto('/user');
	}
</script>

<div class="flex w-full flex-col sm:w-3xl">
	{@render children()}
</div>

<div class="dock dock-md">
	<button onclick={goToHome} class:dock-active={isHome}>
		{#if isHome}
			<HomeFilledIcon class="size-5" />
		{:else}
			<HomeIcon class="size-5" />
		{/if}
		<span class="dock-label">Home</span>
	</button>

	<button onclick={goToInbox} class:dock-active={isInbox}>
		{#if isInbox}
			<InboxFilledIcon class="size-5" />
		{:else}
			<InboxIcon class="size-5" />
		{/if}
		<span class="dock-label">Inbox</span>
	</button>

	<button onclick={goToProfile} class:dock-active={isProfile}>
		{#if isProfile}
			<AccountFilledIcon class="size-5" />
		{:else}
			<AccountIcon class="size-5" />
		{/if}
		<span class="dock-label">Profile</span>
	</button>
</div>
