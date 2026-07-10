// src/lib/server/mock/rest-mock.spec.ts
import { describe, it, expect } from 'vitest';
import { findMockRoute, handleMockRequest, mockRoutes } from './rest-mock';

describe('rest-mock routing', () => {
	it('matches the Zarinpal request endpoint on both hosts', () => {
		const sandbox = findMockRoute(
			new URL('https://sandbox.zarinpal.com/pg/v4/payment/request.json'),
			'POST'
		);
		const prod = findMockRoute(
			new URL('https://api.zarinpal.com/pg/v4/payment/request.json'),
			'POST'
		);

		expect(sandbox?.name).toBe('zarinpal.request');
		expect(prod?.name).toBe('zarinpal.request');
	});

	it('is case-insensitive on the HTTP method', () => {
		const route = findMockRoute(
			new URL('https://api.zarinpal.com/pg/v4/payment/verify.json'),
			'post'
		);
		expect(route?.name).toBe('zarinpal.verify');
	});

	it('does not match a GET against a POST-only route', () => {
		const route = findMockRoute(
			new URL('https://api.zarinpal.com/pg/v4/payment/request.json'),
			'GET'
		);
		expect(route).toBeUndefined();
	});

	it('matches the CoinGecko price endpoint', () => {
		const route = findMockRoute(
			new URL('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=eur,irr'),
			'GET'
		);
		expect(route?.name).toBe('coingecko.simplePrice');
	});
});

describe('rest-mock responses', () => {
	it('returns a successful Zarinpal payment request with a MOCK_ authority', async () => {
		const response = await handleMockRequest(
			new Request('https://api.zarinpal.com/pg/v4/payment/request.json', { method: 'POST' })
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.data.code).toBe(100);
		expect(body.data.authority).toMatch(/^MOCK_/);
	});

	it('returns a successful Zarinpal verification with a ref id', async () => {
		const response = await handleMockRequest(
			new Request('https://api.zarinpal.com/pg/v4/payment/verify.json', { method: 'POST' })
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.data.code).toBe(100);
		expect(typeof body.data.ref_id).toBe('number');
	});

	it('returns CoinGecko prices for the requested ids', async () => {
		const response = await handleMockRequest(
			new Request(
				'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=eur,irr',
				{ method: 'GET' }
			)
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.tether).toEqual({ eur: 0.92, irr: 41500 });
	});

	it('returns 501 for an unregistered route', async () => {
		const response = await handleMockRequest(
			new Request('https://example.com/unknown/endpoint', { method: 'GET' })
		);
		const body = await response.json();

		expect(response.status).toBe(501);
		expect(body.error).toBe('not_mocked');
	});
});

describe('rest-mock registry', () => {
	it('exposes every route with a name, matcher and handler', () => {
		expect(mockRoutes.length).toBeGreaterThan(0);
		for (const route of mockRoutes) {
			expect(typeof route.name).toBe('string');
			expect(typeof route.match).toBe('function');
			expect(typeof route.handle).toBe('function');
		}
	});
});
