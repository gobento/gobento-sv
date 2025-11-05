<script lang="ts">
	import { Map, TileLayer, Marker } from 'sveaflet';
	import { browser } from '$app/environment';

	interface MarkedMapProps {
		latitude: number;
		longitude: number;
	}

	let { latitude, longitude }: MarkedMapProps = $props();

	// Custom marker using Tailwind/DaisyUI classes
	const customMarkerHtml = `
		<div class="relative size-10">
			<div class="absolute top-1/2 left-1/2 size-10 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] border-[3px] border-white " style="border-radius: 50% 50% 50% 0;"></div>
			<div class="absolute top-1/2 left-1/2 size-4 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
		</div>
	`;
</script>

{#if browser}
	<Map
		options={{
			center: [latitude, longitude],
			zoom: 15,
			minZoom: 1,
			maxZoom: 18
		}}
		class="h-full w-full"
	>
		<TileLayer
			url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}
			attribution={"&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"}
		/>
		<Marker latLng={[latitude, longitude]} width={40} height={40} html={customMarkerHtml}></Marker>
	</Map>
{/if}
