/** The place a user browses around. Kept in localStorage so it survives visits. */
export interface UserLocation {
	name: string;
	lat: number;
	lon: number;
}

const STORAGE_KEY = 'userLocation';
const GEOCODER = 'https://nominatim.openstreetmap.org';

export function readSavedLocation(): UserLocation | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const value = JSON.parse(raw) as Partial<UserLocation> | null;
		if (
			value &&
			typeof value.lat === 'number' &&
			typeof value.lon === 'number' &&
			Number.isFinite(value.lat) &&
			Number.isFinite(value.lon)
		) {
			return { name: String(value.name ?? 'Selected place'), lat: value.lat, lon: value.lon };
		}
	} catch {
		// Corrupt or unavailable storage simply means "no saved place".
	}
	return null;
}

export function saveLocation(location: UserLocation | null): void {
	try {
		if (location) localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Private mode: the choice still applies for this visit through the URL.
	}
}

/** "Oranienstraße, Kreuzberg, Berlin, 10999, Germany" -> "Oranienstraße, Kreuzberg" */
export function shortPlaceName(name: string): string {
	return name
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
		.slice(0, 2)
		.join(', ');
}

export async function searchAddress(query: string, signal?: AbortSignal): Promise<UserLocation[]> {
	const response = await fetch(
		`${GEOCODER}/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
		{ signal, headers: { Accept: 'application/json' } }
	);
	if (!response.ok) throw new Error(`Address search failed (${response.status})`);
	const results = (await response.json()) as { display_name: string; lat: string; lon: string }[];
	return results
		.map((result) => ({
			name: result.display_name,
			lat: parseFloat(result.lat),
			lon: parseFloat(result.lon)
		}))
		.filter((result) => Number.isFinite(result.lat) && Number.isFinite(result.lon));
}

export type LocateFailure = 'unsupported' | 'denied' | 'unavailable';

export class LocateError extends Error {
	constructor(public reason: LocateFailure) {
		super(reason);
	}
}

export const LOCATE_MESSAGES: Record<LocateFailure, string> = {
	unsupported: 'This device cannot share its location. Search for an address instead.',
	denied: 'Location access is blocked. Allow it in your browser, or search for an address.',
	unavailable: 'We could not find your position. Try again or search for an address.'
};

/** Asks the browser for the position, then names it (best effort). */
export async function locateMe(): Promise<UserLocation> {
	if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
		throw new LocateError('unsupported');
	}

	const position = await new Promise<GeolocationPosition>((resolve, reject) => {
		navigator.geolocation.getCurrentPosition(resolve, reject, {
			timeout: 10000,
			maximumAge: 5 * 60 * 1000
		});
	}).catch((error: GeolocationPositionError) => {
		throw new LocateError(error?.code === 1 ? 'denied' : 'unavailable');
	});

	const { latitude: lat, longitude: lon } = position.coords;
	let name = 'Current location';
	try {
		const response = await fetch(`${GEOCODER}/reverse?format=json&zoom=16&lat=${lat}&lon=${lon}`, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(6000)
		});
		if (response.ok) {
			const result = (await response.json()) as { display_name?: string };
			if (result.display_name) name = result.display_name;
		}
	} catch {
		// The coordinates are what matters; a missing street name is fine.
	}
	return { name, lat, lon };
}

/** One result from Nominatim's `/search` endpoint (only the fields we read). */
export interface GeocodeResult {
	place_id: number;
	display_name: string;
	lat: string;
	lon: string;
	address?: Partial<
		Record<'city' | 'town' | 'village' | 'state' | 'province' | 'country' | 'postcode', string>
	>;
}
