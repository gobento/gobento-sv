import { describe, expect, it } from 'vitest';
import { deviceFromUserAgent, displayRoute, MAX_BEACON_EVENTS, parseBeacon } from './telemetry';

describe('parseBeacon', () => {
	it('keeps valid vitals and errors', () => {
		expect(
			parseBeacon([
				{ type: 'vital', name: 'lcp', value: 1234.5, route: '/(dock)/offers/[id]' },
				{ type: 'error', message: ' boom ', stack: 'at x', route: '/(dock)/discover' }
			])
		).toEqual([
			{ type: 'vital', name: 'lcp', value: 1234.5, route: '/(dock)/offers/[id]' },
			{ type: 'error', message: 'boom', stack: 'at x', route: '/(dock)/discover' }
		]);
	});

	it('drops unknown names, bad numbers and empty messages', () => {
		expect(
			parseBeacon([
				{ type: 'vital', name: 'nope', value: 1 },
				{ type: 'vital', name: 'lcp', value: -1 },
				{ type: 'vital', name: 'lcp', value: Number.NaN },
				{ type: 'vital', name: 'cls', value: 500 },
				{ type: 'vital', name: 'ttfb', value: '12' },
				{ type: 'error', message: '   ' },
				{ type: 'other' },
				null,
				'x'
			])
		).toEqual([]);
	});

	it('rejects non-arrays and caps the batch size', () => {
		expect(parseBeacon({ type: 'error', message: 'x' })).toEqual([]);
		const many = Array.from({ length: 50 }, () => ({ type: 'vital', name: 'nav', value: 10 }));
		expect(parseBeacon(many)).toHaveLength(MAX_BEACON_EVENTS);
	});

	it('discards concrete URLs as routes and clips long text', () => {
		const [event] = parseBeacon([
			{ type: 'error', message: 'x'.repeat(2000), route: 'https://evil.example/?q=1' }
		]);
		expect(event).toMatchObject({ route: null });
		expect(event.type === 'error' && event.message.length).toBe(500);
		expect(
			parseBeacon([{ type: 'vital', name: 'nav', value: 1, route: '/offers?id=1' }])[0].route
		).toBeNull();
	});
});

describe('deviceFromUserAgent', () => {
	it('classifies common agents', () => {
		expect(
			deviceFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile')
		).toBe('mobile');
		expect(deviceFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130')).toBe(
			'desktop'
		);
		expect(deviceFromUserAgent('Googlebot/2.1')).toBe('bot');
		expect(deviceFromUserAgent(null)).toBe('desktop');
	});
});

describe('displayRoute', () => {
	it('strips route groups', () => {
		expect(displayRoute('/(dock)/admin/telemetry')).toBe('/admin/telemetry');
		expect(displayRoute('/(dock)')).toBe('/');
		expect(displayRoute(null)).toBe('(no route)');
	});
});
