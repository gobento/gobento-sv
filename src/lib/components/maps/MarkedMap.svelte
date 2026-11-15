<!-- Small map with one pin. Import it lazily: it pulls in Leaflet. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { addBaseLayer, loadLeaflet, pinIcon } from './leaflet';
	import './map.css';

	interface MarkedMapProps {
		latitude: number;
		longitude: number;
		/** Static preview: no dragging or zooming, so it never traps page scroll. */
		interactive?: boolean;
	}

	let { latitude, longitude, interactive = true }: MarkedMapProps = $props();

	let container: HTMLDivElement;

	onMount(() => {
		let map: import('leaflet').Map | undefined;
		let cancelled = false;

		loadLeaflet().then((L) => {
			if (cancelled) return;
			map = L.map(container, {
				center: [latitude, longitude],
				zoom: 15,
				zoomControl: interactive,
				dragging: interactive,
				scrollWheelZoom: false,
				doubleClickZoom: interactive,
				touchZoom: interactive,
				boxZoom: false,
				keyboard: interactive
			});
			addBaseLayer(L, map);
			L.marker([latitude, longitude], { icon: pinIcon(L), interactive: false }).addTo(map);
		});

		return () => {
			cancelled = true;
			map?.remove();
		};
	});
</script>

<div
	bind:this={container}
	class="size-full"
	role="img"
	aria-label="Map of the pickup location"
></div>
