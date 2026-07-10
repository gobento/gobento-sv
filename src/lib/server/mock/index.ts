// src/lib/server/mock/index.ts
import { env } from '$env/dynamic/private';
import { handleMockRequest } from './rest-mock';

export { handleMockRequest, findMockRoute, mockRoutes } from './rest-mock';
export type { MockRoute } from './rest-mock';

/**
 * Whether outbound server-side REST calls should be routed to the in-process
 * rest-mock backend instead of hitting the real network.
 *
 * Enabled by setting the `MOCK` env var to `true`. The legacy `MOCK_PAYMENTS`
 * flag is honoured as a backwards-compatible alias.
 */
export function isMockEnabled(): boolean {
	return env.MOCK === 'true' || env.MOCK_PAYMENTS === 'true';
}

/**
 * Drop-in replacement for the global `fetch`, intended for server-side calls to
 * third-party REST APIs. When mocking is enabled the request is served by the
 * rest-mock backend; otherwise it is forwarded to the real `fetch`.
 */
export const mockableFetch: typeof fetch = async (input, init) => {
	if (isMockEnabled()) {
		return handleMockRequest(new Request(input, init));
	}
	return fetch(input, init);
};
