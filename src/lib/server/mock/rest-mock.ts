// src/lib/server/mock/rest-mock.ts
/**
 * REST mock backend.
 *
 * A tiny in-process REST "server" used for local development and automated
 * tests. It matches outbound requests against the third-party REST APIs the
 * application depends on (Zarinpal, CoinGecko) and returns deterministic
 * responses, so no real network calls are made while mocking is enabled.
 *
 * This module is intentionally free of any SvelteKit / environment imports so
 * that the router can be unit tested in isolation. The decision of *whether*
 * to use the mock backend lives in `./index.ts` (`isMockEnabled` /
 * `mockableFetch`).
 */

export interface MockRoute {
	/** Human readable name, used in logs. */
	name: string;
	/** Returns true when this route should handle the given request. */
	match: (url: URL, method: string) => boolean;
	/** Produces the mock response. */
	handle: (request: Request, url: URL) => Response | Promise<Response>;
}

/** Build a JSON `Response` with sane defaults. */
function json(body: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		...init,
		headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) }
	});
}

/** Generate a deterministic-looking mock Zarinpal authority. */
function mockAuthority(): string {
	return `MOCK_${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
}

/**
 * Registered mock routes. Matching is done by pathname suffix so that both the
 * sandbox and production hosts of a given provider resolve to the same mock.
 */
export const mockRoutes: MockRoute[] = [
	{
		name: 'zarinpal.request',
		match: (url, method) =>
			method === 'POST' && url.pathname.endsWith('/pg/v4/payment/request.json'),
		handle: () =>
			json({
				data: {
					code: 100,
					message: 'Success',
					authority: mockAuthority(),
					fee_type: 'Merchant',
					fee: 0
				},
				errors: []
			})
	},
	{
		name: 'zarinpal.verify',
		match: (url, method) =>
			method === 'POST' && url.pathname.endsWith('/pg/v4/payment/verify.json'),
		handle: () =>
			json({
				data: {
					code: 100,
					message: 'Verified',
					card_hash: '0'.repeat(64),
					card_pan: '502229******5995',
					ref_id: Math.floor(Math.random() * 1_000_000),
					fee_type: 'Merchant',
					fee: 0
				},
				errors: []
			})
	},
	{
		name: 'coingecko.simplePrice',
		match: (url, method) => method === 'GET' && url.pathname.endsWith('/api/v3/simple/price'),
		handle: (_request, url) => {
			// Echo back the requested coin ids with deterministic mock rates.
			const ids = (url.searchParams.get('ids') ?? 'tether').split(',');
			const prices: Record<string, { eur: number; irr: number }> = {};
			for (const id of ids) {
				prices[id] = { eur: 0.92, irr: 41500 };
			}
			return json(prices);
		}
	}
];

/** Find the mock route that should handle the request, if any. */
export function findMockRoute(url: URL, method: string): MockRoute | undefined {
	const normalizedMethod = method.toUpperCase();
	return mockRoutes.find((route) => route.match(url, normalizedMethod));
}

/**
 * Handle a request against the mock REST backend.
 *
 * Unmatched requests deliberately return `501 Not Implemented` (rather than
 * silently succeeding) so that a missing mock route is obvious during testing.
 */
export async function handleMockRequest(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const route = findMockRoute(url, request.method);

	if (!route) {
		console.warn(`[rest-mock] No mock route for ${request.method} ${url.href}`);
		return new Response(
			JSON.stringify({
				error: 'not_mocked',
				message: `No mock route registered for ${request.method} ${url.pathname}`
			}),
			{ status: 501, headers: { 'content-type': 'application/json' } }
		);
	}

	console.log(`[rest-mock] ${route.name} <- ${request.method} ${url.pathname}`);
	return route.handle(request, url);
}
