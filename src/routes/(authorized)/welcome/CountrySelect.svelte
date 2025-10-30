<!-- src/lib/components/CountrySelect.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import IconChevronDown from '~icons/fluent/chevron-down-24-regular';
	import type { ComponentType } from 'svelte';

	interface Country {
		code: string;
		name: string;
		flag: ComponentType;
	}

	interface Props {
		countries: Country[];
		value?: string;
		disabled?: boolean;
		error?: boolean;
		onchange?: (value: string) => void;
		name?: string;
		id?: string;
	}

	let {
		countries,
		value = $bindable(''),
		disabled = false,
		error = false,
		onchange,
		name = 'country',
		id = 'country'
	}: Props = $props();

	let isOpen = $state(false);
	let dropdownRef: HTMLDivElement;
	let buttonRef: HTMLButtonElement;

	const selectedCountry = $derived(countries.find((c) => c.code === value));

	function toggleDropdown() {
		if (!disabled) {
			isOpen = !isOpen;
		}
	}

	function selectCountry(country: Country) {
		value = country.code;
		isOpen = false;
		onchange?.(country.code);
	}

	function handleClickOutside(event: MouseEvent) {
		if (
			dropdownRef &&
			!dropdownRef.contains(event.target as Node) &&
			buttonRef &&
			!buttonRef.contains(event.target as Node)
		) {
			isOpen = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isOpen = false;
			buttonRef?.focus();
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div class="relative">
	<!-- Hidden input for form submission -->
	<input type="hidden" {name} {value} />

	<!-- Custom select button -->
	<button
		bind:this={buttonRef}
		type="button"
		{id}
		class="select-bordered select flex w-full items-center justify-between"
		class:select-error={error}
		class:opacity-50={disabled}
		onclick={toggleDropdown}
		{disabled}
	>
		{#if selectedCountry}
			<div class="flex items-center gap-2">
				<svelte:component this={selectedCountry.flag} class="size-5" />
				<span>{selectedCountry.name}</span>
			</div>
		{:else}
			<span class="text-base-content/50">Select your country</span>
		{/if}
		<IconChevronDown class="size-5 transition-transform" class:rotate-180={isOpen} />
	</button>

	<!-- Dropdown menu -->
	{#if isOpen}
		<div
			bind:this={dropdownRef}
			class="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-box border border-base-300 bg-base-100 shadow-lg"
		>
			<ul class="menu p-2">
				{#each countries as country}
					<li>
						<button
							type="button"
							class="flex items-center gap-2"
							class:active={value === country.code}
							onclick={() => selectCountry(country)}
						>
							<svelte:component this={country.flag} class="size-5" />
							<span>{country.name}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
