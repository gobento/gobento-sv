// src/lib/server/mock/index.ts
import { DATABASE_URL, MOCK, MOCK_PAYMENTS } from '$app/env/private';
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
	return MOCK === 'true' || MOCK_PAYMENTS === 'true';
}

/**
 * Fully offline mode: mocking is on and no DATABASE_URL is set, so the app
 * runs on the in-process demo database with in-memory file storage and
 * demo sign-in. With a real database, files live in the real bucket even
 * while REST calls (payments) are mocked.
 */
export function isOfflineMode(): boolean {
	return isMockEnabled() && !DATABASE_URL;
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
