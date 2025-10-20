<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import CompassIcon from '~icons/fluent/compass-northwest-24-regular';
	import CompassFilledIcon from '~icons/fluent/compass-northwest-24-filled';
	import SearchIcon from '~icons/fluent/search-24-regular';
	import SearchFilledIcon from '~icons/fluent/search-24-filled';
	import HeartIcon from '~icons/fluent/heart-24-regular';
	import HeartFilledIcon from '~icons/fluent/heart-24-filled';
	import PersonIcon from '~icons/fluent/person-24-regular';
	import PersonFilledIcon from '~icons/fluent/person-24-filled';

	let { children } = $props();

	// Derive active states from current path
	const isDiscover = $derived($page.url.pathname === '/');
	const isSearch = $derived($page.url.pathname === '/search');
	const isFavorites = $derived($page.url.pathname === '/favorites');
	const isProfile = $derived($page.url.pathname === '/profile');

	function goToDiscover() {
		goto('/');
	}

	function goToSearch() {
		goto('/search');
	}

	function goToFavorites() {
		goto('/favorites');
	}

	function goToProfile() {
		goto('/profile');
	}
</script>

<div class="flex w-full flex-col sm:w-3xl">
	{@render children()}
</div>

<div class="dock dock-md">
	<button onclick={goToDiscover} class:dock-active={isDiscover}>
		{#if isDiscover}
			<CompassFilledIcon class="size-6" />
		{:else}
			<CompassIcon class="size-6" />
		{/if}
		<span class="dock-label">Discover</span>
	</button>

	<button onclick={goToSearch} class:dock-active={isSearch}>
		{#if isSearch}
			<SearchFilledIcon class="size-6" />
		{:else}
			<SearchIcon class="size-6" />
		{/if}
		<span class="dock-label">Search</span>
	</button>

	<button onclick={goToFavorites} class:dock-active={isFavorites}>
		{#if isFavorites}
			<HeartFilledIcon class="size-6" />
		{:else}
			<HeartIcon class="size-6" />
		{/if}
		<span class="dock-label">Favorites</span>
	</button>

	<button onclick={goToProfile} class:dock-active={isProfile}>
		{#if isProfile}
			<PersonFilledIcon class="size-6" />
		{:else}
			<PersonIcon class="size-6" />
		{/if}
		<span class="dock-label">Profile</span>
	</button>
</div>

<!-- TODO: use different navigation depending on if profile is business, user or charity. currently, it is just user 	-->
