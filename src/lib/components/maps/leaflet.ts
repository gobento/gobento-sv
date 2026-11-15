import type * as Leaflet from 'leaflet';

export type LeafletModule = typeof Leaflet;

let pending: Promise<LeafletModule> | null = null;

/** Leaflet (JS + CSS) is only fetched once a map is actually shown. */
export function loadLeaflet(): Promise<LeafletModule> {
	pending ??= Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(
		([module]) => (module.default ?? module) as LeafletModule
	);
	return pending;
}

export function addBaseLayer(L: LeafletModule, map: Leaflet.Map): void {
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
	}).addTo(map);
	map.attributionControl?.setPrefix(false);
}

/** Teardrop pin in the brand colour. */
export function pinIcon(L: LeafletModule): Leaflet.DivIcon {
	return L.divIcon({
		className: '',
		iconSize: [36, 44],
		iconAnchor: [18, 42],
		html: `<div class="map-pin"><span></span></div>`
	});
}

/** Pulsing dot for "you are here". */
export function youAreHereIcon(L: LeafletModule): Leaflet.DivIcon {
	return L.divIcon({
		className: '',
		iconSize: [22, 22],
		iconAnchor: [11, 11],
		html: `<div class="map-you"></div>`
	});
}

export function directionsUrl(latitude: number, longitude: number): string {
	return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}
