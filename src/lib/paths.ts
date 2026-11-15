// src/lib/paths.ts
import type { ResolvedPathname } from '$app/types';

/** Append a query string to an already resolved path (none when it is empty). */
export function withSearch(
	path: ResolvedPathname,
	params: URLSearchParams | Record<string, string>
): ResolvedPathname {
	const search = new URLSearchParams(params).toString();
	return (search ? `${path}?${search}` : path) as ResolvedPathname;
}
