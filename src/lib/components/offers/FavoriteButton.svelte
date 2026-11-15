<!-- Heart toggle for a location. Posts to the location page's form actions. -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import IconHeart from '~icons/fluent/heart-24-regular';
	import IconHeartFilled from '~icons/fluent/heart-24-filled';
	import { toast } from '#lib/components/ui/toast.svelte';

	interface Props {
		locationId: string;
		favorite: boolean;
		/** Name used in the toast and the accessible label. */
		name?: string;
		size?: 'sm' | 'md';
		onchange?: (favorite: boolean) => void;
		class?: string;
	}

	let {
		locationId,
		favorite = $bindable(),
		name = 'this place',
		size = 'md',
		onchange,
		class: className = ''
	}: Props = $props();

	let pending = $state(false);
	let celebrate = $state(false);
</script>

<form
	method="POST"
	action="/locations/{locationId}?/{favorite ? 'removeFavorite' : 'addFavorite'}"
	class="contents"
	use:enhance={() => {
		const previous = favorite;
		pending = true;
		// Optimistic: the heart reacts on tap, the server confirms afterwards.
		favorite = !previous;
		celebrate = favorite;

		return async ({ result }) => {
			pending = false;
			if (result.type === 'success') {
				toast.success(favorite ? `Saved ${name} to favourites` : `Removed ${name} from favourites`);
				onchange?.(favorite);
			} else {
				favorite = previous;
				celebrate = false;
				toast.error('Could not update your favourites. Please try again.');
			}
		};
	}}
>
	<button
		type="submit"
		disabled={pending}
		aria-pressed={favorite}
		aria-label={favorite ? `Remove ${name} from favourites` : `Save ${name} to favourites`}
		class="flex shrink-0 items-center justify-center rounded-full bg-base-100/92 shadow-soft backdrop-blur transition-transform duration-200 ease-spring hover:scale-110 active:scale-90 {size ===
		'sm'
			? 'size-9'
			: 'size-11'} {favorite ? 'text-error' : 'text-base-content/70'} {className}"
	>
		{#if favorite}
			<IconHeartFilled
				class="{size === 'sm' ? 'size-5' : 'size-6'} {celebrate ? 'animate-heart' : ''}"
			/>
		{:else}
			<IconHeart class={size === 'sm' ? 'size-5' : 'size-6'} />
		{/if}
	</button>
</form>
