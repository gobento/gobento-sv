// src/lib/client/telemetry.ts
/**
 * Browser half of the admin telemetry: page-load metrics (TTFB, FCP, LCP, CLS,
 * INP), client-side navigation durations and uncaught errors. Events are
 * queued and sent with `sendBeacon` when the tab is hidden or the queue fills.
 */
import { MAX_BEACON_EVENTS, type ClientTelemetry, type VitalName } from '#lib/telemetry.js';

const ENDPOINT = '/api/telemetry';
const MAX_ERRORS_PER_PAGE = 10;
const FLUSH_INTERVAL_MS = 15_000;

let queue: ClientTelemetry[] = [];
let started = false;
let errorCount = 0;
const seenErrors = new Set<string>();
let currentRoute: () => string | null = () => null;

function push(event: ClientTelemetry): void {
	queue.push(event);
	if (queue.length >= MAX_BEACON_EVENTS) flush();
}

function vital(name: VitalName, value: number, route = currentRoute()): void {
	if (Number.isFinite(value) && value >= 0) {
		push({ type: 'vital', name, value: Math.round(value * 1000) / 1000, route });
	}
}

function flush(): void {
	if (queue.length === 0) return;
	const body = JSON.stringify(queue.slice(0, MAX_BEACON_EVENTS));
	queue = queue.slice(MAX_BEACON_EVENTS);
	try {
		const blob = new Blob([body], { type: 'application/json' });
		if (!navigator.sendBeacon?.(ENDPOINT, blob)) {
			fetch(ENDPOINT, { method: 'POST', body, keepalive: true }).catch(() => {});
		}
	} catch {
		// Telemetry must never break the page.
	}
	if (queue.length) flush();
}

function reportError(message: string, stack: string | null): void {
	if (errorCount >= MAX_ERRORS_PER_PAGE) return;
	const key = `${message}\n${stack ?? ''}`;
	if (seenErrors.has(key)) return;
	seenErrors.add(key);
	errorCount++;
	push({ type: 'error', message, stack, route: currentRoute() });
}

function observe(type: string, callback: (entries: PerformanceEntry[]) => void, extra = {}): void {
	try {
		const observer = new PerformanceObserver((list) => callback(list.getEntries()));
		observer.observe({ type, buffered: true, ...extra });
	} catch {
		// Entry type not supported by this browser.
	}
}

/** Start collecting. `route` returns the current SvelteKit route id. */
export function startTelemetry(route: () => string | null): void {
	if (started || typeof window === 'undefined') return;
	started = true;
	currentRoute = route;
	const loadRoute = route();

	const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
	if (navigation) vital('ttfb', navigation.responseStart, loadRoute);

	observe('paint', (entries) => {
		for (const entry of entries) {
			if (entry.name === 'first-contentful-paint') vital('fcp', entry.startTime, loadRoute);
		}
	});

	// LCP, CLS and INP are final only once the user leaves; report them then.
	let lcp = -1;
	let cls = 0;
	let inp = -1;
	observe('largest-contentful-paint', (entries) => {
		const last = entries.at(-1);
		if (last) lcp = last.startTime;
	});
	observe('layout-shift', (entries) => {
		for (const entry of entries as (PerformanceEntry & {
			value: number;
			hadRecentInput: boolean;
		})[]) {
			if (!entry.hadRecentInput) cls += entry.value;
		}
	});
	observe(
		'event',
		(entries) => {
			for (const entry of entries) inp = Math.max(inp, entry.duration);
		},
		{ durationThreshold: 40 }
	);

	let pageMetricsSent = false;
	const sendPageMetrics = () => {
		if (pageMetricsSent) return;
		pageMetricsSent = true;
		if (lcp >= 0) vital('lcp', lcp, loadRoute);
		vital('cls', cls, loadRoute);
		if (inp >= 0) vital('inp', inp, loadRoute);
	};

	addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			sendPageMetrics();
			flush();
		}
	});
	addEventListener('pagehide', () => {
		sendPageMetrics();
		flush();
	});
	setInterval(flush, FLUSH_INTERVAL_MS);

	addEventListener('error', (event) => {
		const error = event.error as Error | undefined;
		reportError(error?.message || event.message || 'Unknown error', error?.stack ?? null);
	});
	addEventListener('unhandledrejection', (event) => {
		const reason = event.reason as unknown;
		if (reason instanceof Error) reportError(reason.message, reason.stack ?? null);
		else reportError(`Unhandled rejection: ${String(reason).slice(0, 200)}`, null);
	});
}

let navigationStart: number | null = null;

/** Call from `beforeNavigate` for client-side navigations. */
export function markNavigationStart(): void {
	navigationStart = performance.now();
}

/** Call from `afterNavigate`; records how long the navigation took. */
export function markNavigationEnd(route: string | null): void {
	if (navigationStart === null) return;
	vital('nav', performance.now() - navigationStart, route);
	navigationStart = null;
}
