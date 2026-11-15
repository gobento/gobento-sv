<!-- Sheet for choosing where to browse: current position or an address search. -->
<script lang="ts">
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconMyLocation from '~icons/fluent/my-location-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import Modal from '#lib/components/Modal.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import { toast } from '#lib/components/ui/toast.svelte';
	import {
		LOCATE_MESSAGES,
		LocateError,
		locateMe,
		searchAddress,
		shortPlaceName,
		type UserLocation
	} from './userLocation';

	interface Props {
		open: boolean;
		current: UserLocation | null;
		onselect: (location: UserLocation | null) => void;
	}

	let { open = $bindable(false), current, onselect }: Props = $props();

	let query = $state('');
	let results = $state<UserLocation[]>([]);
	let searching = $state(false);
	let searched = $state(false);
	let locating = $state(false);

	let debounce: ReturnType<typeof setTimeout> | undefined;
	let controller: AbortController | undefined;

	function reset() {
		clearTimeout(debounce);
		controller?.abort();
		query = '';
		results = [];
		searching = false;
		searched = false;
	}

	function choose(location: UserLocation | null) {
		onselect(location);
		open = false;
		reset();
	}

	function onInput() {
		clearTimeout(debounce);
		controller?.abort();
		const term = query.trim();
		if (term.length < 3) {
			results = [];
			searching = false;
			searched = false;
			return;
		}

		searching = true;
		debounce = setTimeout(async () => {
			controller = new AbortController();
			try {
				results = await searchAddress(term, controller.signal);
				searched = true;
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') return;
				results = [];
				toast.error('Address search is not available right now. Please try again.');
			}
			searching = false;
		}, 400);
	}

	async function useCurrentPosition() {
		if (locating) return;
		locating = true;
		try {
			choose(await locateMe());
		} catch (error) {
			toast.error(LOCATE_MESSAGES[error instanceof LocateError ? error.reason : 'unavailable']);
		} finally {
			locating = false;
		}
	}
</script>

<Modal bind:open title="Where are you?" position="bottom" onclose={reset}>
	<div class="flex flex-col gap-4">
		<label class="input w-full rounded-full">
			<IconSearch class="size-5 text-base-content/50" />
			<input
				type="search"
				placeholder="Street, neighbourhood or city"
				aria-label="Search for an address"
				autocomplete="off"
				enterkeyhint="search"
				bind:value={query}
				oninput={onInput}
			/>
			{#if searching}
				<Spinner size="xs" />
			{/if}
		</label>

		<Button
			variant="plain"
			block
			icon={IconMyLocation}
			loading={locating}
			loadingLabel="Finding you…"
			class="justify-start rounded-2xl bg-primary/10 text-primary hover:bg-primary/15"
			onclick={useCurrentPosition}
		>
			Use my current location
		</Button>

		{#if results.length > 0}
			<ul class="flex flex-col gap-1" aria-label="Matching addresses">
				{#each results as result, index (result.name + index)}
					<li class="stagger animate-rise-in" style:--i={index}>
						<button
							type="button"
							class="flex min-h-12 w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-start transition-colors hover:bg-base-200 active:bg-base-200"
							onclick={() => choose(result)}
						>
							<IconLocation class="mt-0.5 size-5 shrink-0 text-primary" />
							<span class="min-w-0">
								<span class="block truncate font-bold">{shortPlaceName(result.name)}</span>
								<span class="line-clamp-2 text-sm text-base-content/60">{result.name}</span>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{:else if searched && !searching}
			<p class="rounded-2xl bg-base-200/60 px-4 py-6 text-center text-sm text-base-content/60">
				No place matches “{query.trim()}”. Check the spelling or try a nearby city.
			</p>
		{/if}

		{#if current}
			<div class="flex items-center gap-3 rounded-2xl bg-base-200/60 py-2 ps-4 pe-2">
				<div class="min-w-0 flex-1">
					<p class="eyebrow">Browsing near</p>
					<p class="truncate font-bold">{shortPlaceName(current.name)}</p>
				</div>
				<Button variant="ghost" size="sm" icon={IconDismiss} onclick={() => choose(null)}>
					Clear
				</Button>
			</div>
		{/if}
	</div>
</Modal>
