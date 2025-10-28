<!-- src/routes/(dock)/favorites/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import NotFound from '$lib/components/NotFound.svelte';
	import IconHeart from '~icons/fluent/heart-24-filled';
	import IconHeartBroken from '~icons/fluent/heart-broken-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconMapPin from '~icons/fluent/location-24-filled';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';

	let { data } = $props();

	// Track which locations are being removed
	let removingIds = $state(new Set<string>());

	const getFileUrl = (key: string) => {
		return `/api/files/${key}`;
	};

	const handleRemove = (locationId: string) => {
		return ({ update, result }: any) => {
			removingIds.add(locationId);
			return async () => {
				await update();
				if (result.type === 'success') {
					// Keep in removing state - the page will reload
				} else {
					removingIds.delete(locationId);
				}
			};
		};
	};

	const description = $derived(
		`${data.favorites.length} ${data.favorites.length === 1 ? 'location' : 'locations'} saved`
	);
</script>

<svelte:head>
	<title>My Favorite Locations</title>
</svelte:head>

<BaseLayout title="My Favorite Locations" {description} icon={IconHeart}>
	{#if data.favorites.length === 0}
		<NotFound
			icon={IconHeartBroken}
			title="No favorites yet"
			description="Start exploring locations and tap the heart icon to save your favorites here"
			actionLabel="Browse Locations"
			actionHref="/locations"
			actionIcon={IconLocation}
		/>
	{:else}
		<!-- Favorites Grid -->
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each data.favorites as favorite (favorite.locationId)}
				{@const isRemoving = removingIds.has(favorite.locationId)}
				<a
					href="/locations/{favorite.locationId}"
					class="group hover: card relative overflow-hidden bg-base-100 transition-all duration-200 hover:border-primary/50"
					class:opacity-50={isRemoving}
					class:pointer-events-none={isRemoving}
				>
					<!-- Background Image -->
					<div class="relative h-48 bg-linear-to-br from-primary/20 via-primary/10 to-base-200">
						{#if favorite.locationImage}
							<img
								src={getFileUrl(favorite.locationImage.key)}
								alt={favorite.location.name}
								class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
							/>
							<div class="absolute inset-0 bg-linear-to-t from-base-100 to-transparent"></div>
						{:else}
							<div class="absolute inset-0 bg-linear-to-br from-primary/30 to-base-300/50"></div>
						{/if}

						<!-- Remove Button -->
						<form
							method="POST"
							action="?/removeFavorite"
							use:enhance={handleRemove(favorite.locationId)}
							class="absolute top-3 right-3"
							onclick={(e) => e.stopPropagation()}
						>
							<input type="hidden" name="locationId" value={favorite.locationId} />
							<button
								type="submit"
								disabled={isRemoving}
								class="btn btn-circle border-0 bg-base-100/90 backdrop-blur-sm btn-sm hover:bg-error hover:text-error-content"
								class:loading={isRemoving}
								aria-label="Remove from favorites"
							>
								{#if !isRemoving}
									<IconDelete class="size-4" />
								{/if}
							</button>
						</form>

						<!-- Business Logo -->
						<div class="absolute bottom-0 left-4 translate-y-1/2">
							<div class="avatar">
								<div class="size-16 rounded-xl border-4 border-base-100 bg-base-100">
									<img
										src={favorite.business.logo!.url}
										alt={favorite.businessName}
										class="h-full w-full object-cover"
									/>
								</div>
							</div>
						</div>
					</div>

					<!-- Content -->
					<div class="card-body p-5 pt-10">
						<!-- Business Name -->
						<p class="mb-1 text-sm font-medium text-primary">
							{favorite.businessName}
						</p>

						<!-- Location Name -->
						<h3 class="mb-3 line-clamp-1 text-xl font-bold">
							{favorite.location.name}
						</h3>

						<!-- Address -->
						<div class="mb-4 flex items-start gap-2">
							<IconMapPin class="mt-0.5 size-4 shrink-0 text-base-content/60" />
							<p class="line-clamp-2 text-sm text-base-content/70">
								{favorite.location.address}, {favorite.location.city}
								{#if favorite.location.state}, {favorite.location.state}{/if}
							</p>
						</div>

						<!-- Stats -->
						<div class="flex flex-wrap items-center gap-4 text-sm">
							<div class="flex items-center gap-1.5">
								<IconTag class="size-4 text-base-content/60" />
								<span class="font-semibold">
									{favorite.offerCount}
									{favorite.offerCount === 1 ? 'offer' : 'offers'}
								</span>
							</div>
							<div class="flex items-center gap-1.5 text-base-content/60">
								<IconCalendar class="size-4" />
								<span>
									Added {new Date(favorite.favoritedAt).toLocaleDateString('en-US', {
										month: 'short',
										day: 'numeric'
									})}
								</span>
							</div>
						</div>
					</div>

					<!-- Hover Arrow -->
					<div
						class="absolute right-5 bottom-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
					>
						<div
							class="flex size-10 items-center justify-center rounded-full bg-primary text-primary-content"
						>
							<span class="text-xl">→</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</BaseLayout>
