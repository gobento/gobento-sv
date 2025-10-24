<!-- src/routes/(dock)/locations/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconTag from '~icons/fluent/tag-24-regular';
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconMapPin from '~icons/fluent/location-24-regular';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconHeartFilled from '~icons/fluent/heart-24-filled';

	let { data, form } = $props();

	// State for favorite - initialize from server data
	let isFavorite = $state(data.isFavorite ?? false);
	let isTogglingFavorite = $state(false);

	// State for notifications
	let isSubscribed = $state(data.isSubscribed ?? false);
	let isTogglingSubscription = $state(false);
	let showSubscriptionSetup = $state(false);
</script>

<!-- Location Header with Background Image -->
<div class="card mb-8 overflow-hidden border-2 border-base-300 bg-base-100">
	<!-- Background Image Section -->
	<div class="relative h-64 bg-linear-to-br from-primary/20 via-primary/10 to-base-200">
		{#if data.location.imageId && data.locationImage}
			<img
				src={data.locationImage.url}
				alt={data.location.name}
				class="absolute inset-0 h-full w-full object-cover"
			/>
			<div class="absolute inset-0 bg-linear-to-t from-base-100/60 to-transparent"></div>
		{:else}
			<!-- Placeholder gradient background -->
			<div class="absolute inset-0 bg-linear-to-br from-primary/30 to-base-300/50"></div>
		{/if}

		<!-- Business Logo Overlay -->
		<div class="absolute bottom-0 left-8 translate-y-1/2">
			<div class="avatar">
				<div class="size-32 rounded-xl border-4 border-base-100 bg-base-100 shadow-xl">
					<img src={data.business.logo.url} alt={data.business.name} />
				</div>
			</div>
		</div>

		<!-- Action Buttons (Top Right) -->
		<div class="absolute top-4 right-4 flex items-center gap-3">
			{#if data.isOwner}
				<a
					href="/locations/{data.location.id}/edit"
					class="btn btn-circle border-0 bg-base-100/90 shadow-lg hover:bg-base-100"
				>
					<IconEdit class="size-6" />
				</a>
			{/if}

			<!-- Favorite Button -->
			{#if data.isUser}
				<form
					method="POST"
					action="?/{isFavorite ? 'removeFavorite' : 'addFavorite'}"
					use:enhance={() => {
						isTogglingFavorite = true;
						return async ({ update, result }) => {
							await update();
							if (result.type === 'success') {
								isFavorite = !isFavorite;
								// If favoriting and not subscribed, prompt for ntfy topic
								if (isFavorite && !isSubscribed && result.data?.needsNtfyTopic) {
									isSubscribed = true;
								}
								// If unfavoriting, also unsubscribe
								if (!isFavorite && isSubscribed) {
									isSubscribed = false;
								}
							}
							isTogglingFavorite = false;
						};
					}}
				>
					<button
						type="submit"
						disabled={isTogglingFavorite}
						class="btn btn-circle border-0 bg-base-100/90 shadow-lg hover:bg-base-100"
						class:loading={isTogglingFavorite}
						aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
					>
						{#if !isTogglingFavorite}
							{#if isFavorite}
								<IconHeartFilled class="size-6 text-error" />
							{:else}
								<IconHeart class="size-6" />
							{/if}
						{/if}
					</button>
				</form>
			{/if}
		</div>
	</div>

	<!-- Content Section -->
	<div class="card-body p-8 pt-20">
		<div class="flex items-start justify-between gap-6">
			<div class="min-w-0 flex-1">
				<h1 class="mb-4 text-lg font-bold tracking-tight">{data.business.name}</h1>

				<!-- Address Section -->
				<div class="mb-6 flex items-start gap-3">
					<IconMapPin class="mt-0.5 size-5 shrink-0 text-base-content/60" />
					<div class="space-y-1 text-base text-base-content/70">
						<p class="font-medium">{data.location.address}</p>
						<p>
							{data.location.city}{#if data.location.province}, {data.location.province}{/if}
							{#if data.location.zipCode}
								{data.location.zipCode}
							{/if}
						</p>
						<p>{data.location.country}</p>
					</div>
				</div>

				<!-- Stats -->
				<div class="flex flex-wrap items-center gap-6">
					<div class="flex items-center gap-2 text-base-content/60">
						<IconCalendar class="size-5" />
						<span class="text-sm font-medium">
							Saving food since {new Date(data.location.createdAt).toLocaleDateString('en-US', {
								month: 'long',
								day: 'numeric',
								year: 'numeric'
							})}
						</span>
					</div>
				</div>
			</div>

			<!-- Action Buttons -->
			{#if data.isOwner}
				<div class="flex shrink-0 items-center gap-3">
					<a href="/offers/new?locationId={data.location.id}" class="btn gap-2.5 btn-primary">
						<IconAdd class="size-5" />
						Create Offer
					</a>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Notification Subscription Panel -->
{#if showSubscriptionSetup && data.isUser}
	<div class="card mb-8 border-2 border-primary/30 bg-base-100 shadow-lg">
		<div class="card-body">
			<h2 class="card-title">
				<IconAlert class="size-6 text-primary" />
				Push Notifications
			</h2>

			{#if !isSubscribed}
				<div role="alert" class="alert">
					<IconAlert class="size-6" />
					<div>
						<div class="font-bold">Subscribe to this location</div>
						<div class="text-sm">
							Topic: <code class="badge font-mono badge-neutral">location-{data.location.id}</code>
						</div>
					</div>
				</div>

				<p class="text-base-content/70">
					Get notified instantly when new offers are posted at this location. Subscribe to the topic
					above in your ntfy app, then click the button below.
				</p>

				<form
					method="POST"
					action="?/subscribe"
					use:enhance={() => {
						isTogglingSubscription = true;
						return async ({ update, result }) => {
							await update();
							if (result.type === 'success') {
								isSubscribed = true;
								showSubscriptionSetup = false;
							}
							isTogglingSubscription = false;
						};
					}}
					class="mt-4 space-y-4"
				>
					<div class="flex justify-end gap-3">
						<button
							type="button"
							class="btn btn-ghost"
							onclick={() => (showSubscriptionSetup = false)}
						>
							Cancel
						</button>
						<button type="submit" disabled={isTogglingSubscription} class="btn btn-primary">
							{#if isTogglingSubscription}
								<span class="loading loading-sm loading-spinner"></span>
								Subscribing...
							{:else}
								I've Subscribed in ntfy
							{/if}
						</button>
					</div>
				</form>
			{:else}
				<div role="alert" class="alert alert-success">
					<IconAlert class="size-6" />
					<div>
						<div class="font-bold">You're subscribed!</div>
						<div class="text-sm">
							Topic: <code class="badge font-mono text-xs badge-neutral"
								>location-{data.location.id}</code
							>
						</div>
					</div>
				</div>

				<p class="text-sm text-base-content/70">
					You'll receive notifications when new offers are posted at this location.
				</p>

				<form
					method="POST"
					action="?/unsubscribe"
					use:enhance={() => {
						isTogglingSubscription = true;
						return async ({ update, result }) => {
							await update();
							if (result.type === 'success') {
								isSubscribed = false;
							}
							isTogglingSubscription = false;
						};
					}}
					class="mt-4"
				>
					<button type="submit" disabled={isTogglingSubscription} class="btn btn-ghost btn-sm">
						{#if isTogglingSubscription}
							<span class="loading loading-xs loading-spinner"></span>
							Unsubscribing...
						{:else}
							Unsubscribe
						{/if}
					</button>
				</form>
			{/if}
		</div>
	</div>
{/if}

<!-- Offers Section -->
<div class="mb-8">
	<div class="mb-6 flex items-center justify-between">
		<h2 class="text-xl font-bold">
			{data.offers.length}
			{data.offers.length === 1 ? 'Offer' : 'Offers'} at this Location
		</h2>
	</div>

	{#if data.offers.length === 0}
		<!-- Empty State -->
		<div class="card border border-base-300 bg-base-100">
			<div class="card-body items-center py-16 text-center">
				<div class="mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-base-200">
					<IconTag class="h-10 w-10 text-base-content/40" />
				</div>
				<h3 class="mb-2 text-xl font-bold">No offers yet</h3>
				<p class="mb-8 max-w-md text-base-content/60">
					{#if data.isOwner}
						Create your first offer for this location to start attracting customers
					{:else}
						Check back later for special offers at this location
					{/if}
				</p>
				{#if data.isOwner}
					<a href="/offers/new?locationId={data.location.id}" class="btn gap-2.5 btn-primary">
						<IconAdd class="size-5" />
						Create First Offer
					</a>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Offers Grid -->
		<div class="grid gap-5">
			{#each data.offers as offer}
				<div
					class="card border border-base-300 bg-base-100 transition-colors duration-200 hover:border-primary/50"
				>
					<div class="card-body p-6">
						<div class="flex items-start justify-between gap-6">
							<div class="min-w-0 flex-1">
								<div class="mb-3 flex items-center gap-3">
									<h3 class="text-xl font-bold">{offer.name}</h3>
									{#if offer.isActive}
										<span class="badge badge-sm badge-success">Active</span>
									{:else}
										<span class="badge badge-ghost badge-sm">Inactive</span>
									{/if}
								</div>
								<p class="mb-4 leading-relaxed text-base-content/70">{offer.description}</p>
								<div class="flex items-center gap-6">
									<div class="text-xl font-bold text-primary">
										{new Intl.NumberFormat('en-US', {
											style: 'currency',
											currency: offer.currency
										}).format(offer.price)}
									</div>
									<span class="text-sm font-medium text-base-content/50">
										Created {new Date(offer.createdAt).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}
									</span>
								</div>
							</div>
							<a href="/offers/{offer.id}" class="btn gap-2 btn-outline btn-sm">
								View Details
								<span class="text-lg">→</span>
							</a>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
