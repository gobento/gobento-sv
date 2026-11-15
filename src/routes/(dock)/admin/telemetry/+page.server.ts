// src/routes/(dock)/admin/telemetry/+page.server.ts
import type { PageServerLoad } from './$types';
import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db.js';
import { assertAdmin } from '#lib/server/admin.js';
import { pruneTelemetry, TELEMETRY_RETENTION_DAYS } from '#lib/server/telemetry.js';
import { VITAL_NAMES } from '#lib/telemetry.js';

const RANGES = {
	'24h': { hours: 24, bucket: 'hour' },
	'7d': { hours: 24 * 7, bucket: 'day' },
	'30d': { hours: 24 * 30, bucket: 'day' }
} as const;
type Range = keyof typeof RANGES;

async function rows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
	return (await db.execute(query)) as unknown as T[];
}

const num = (value: unknown) => (value === null || value === undefined ? null : Number(value));

export const load: PageServerLoad = async ({ locals, url }) => {
	assertAdmin(locals.account);

	const requested = url.searchParams.get('range') ?? '24h';
	const range: Range = requested in RANGES ? (requested as Range) : '24h';
	const { hours, bucket } = RANGES[range];
	const since = new Date(Date.now() - hours * 60 * 60 * 1000);

	await pruneTelemetry().catch((error) => console.error('Telemetry prune failed:', error));

	const [summary] = await rows<Record<string, unknown>>(sql`
		SELECT
			COUNT(*)::int AS requests,
			COUNT(*) FILTER (WHERE status >= 500)::int AS server_errors,
			COUNT(*) FILTER (WHERE status >= 400 AND status < 500)::int AS client_errors,
			percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50,
			percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95
		FROM telemetry_events
		WHERE kind = 'request' AND created_at >= ${since}
	`);

	const [errorCounts] = await rows<Record<string, unknown>>(sql`
		SELECT
			COUNT(*) FILTER (WHERE kind = 'server_error' AND status >= 500)::int AS crashes,
			COUNT(*) FILTER (WHERE kind = 'client_error')::int AS browser_errors
		FROM telemetry_events
		WHERE kind IN ('server_error', 'client_error') AND created_at >= ${since}
	`);

	const timeline = await rows<Record<string, unknown>>(sql`
		SELECT
			date_trunc(${bucket}, created_at) AS bucket,
			COUNT(*)::int AS requests,
			COUNT(*) FILTER (WHERE status >= 500)::int AS errors,
			percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95
		FROM telemetry_events
		WHERE kind = 'request' AND created_at >= ${since}
		GROUP BY 1
		ORDER BY 1
	`);

	const routes = await rows<Record<string, unknown>>(sql`
		SELECT
			route,
			COUNT(*)::int AS requests,
			COUNT(*) FILTER (WHERE status >= 500)::int AS errors,
			percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50,
			percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95
		FROM telemetry_events
		WHERE kind = 'request' AND created_at >= ${since}
		GROUP BY route
		ORDER BY requests DESC
		LIMIT 25
	`);

	const vitals = await rows<Record<string, unknown>>(sql`
		SELECT
			name,
			COUNT(*)::int AS samples,
			percentile_cont(0.75) WITHIN GROUP (ORDER BY value) AS p75
		FROM telemetry_events
		WHERE kind = 'vital' AND created_at >= ${since}
		GROUP BY name
	`);

	const slowPages = await rows<Record<string, unknown>>(sql`
		SELECT
			route,
			COUNT(*)::int AS samples,
			percentile_cont(0.75) WITHIN GROUP (ORDER BY value) AS p75
		FROM telemetry_events
		WHERE kind = 'vital' AND name = 'lcp' AND created_at >= ${since}
		GROUP BY route
		ORDER BY p75 DESC
		LIMIT 10
	`);

	const errorGroups = await rows<Record<string, unknown>>(sql`
		SELECT
			kind,
			message,
			MIN(route) AS route,
			MAX(status) AS status,
			COUNT(*)::int AS occurrences,
			MAX(created_at) AS last_seen,
			(ARRAY_AGG(error_id ORDER BY created_at DESC))[1] AS error_id,
			(ARRAY_AGG(stack ORDER BY created_at DESC))[1] AS stack
		FROM telemetry_events
		WHERE created_at >= ${since}
			AND (kind = 'client_error' OR (kind = 'server_error' AND status >= 500))
		GROUP BY kind, message
		ORDER BY last_seen DESC
		LIMIT 30
	`);

	const breakdown = await rows<Record<string, unknown>>(sql`
		SELECT
			COALESCE(account_type, 'anonymous') AS account_type,
			COALESCE(device, 'desktop') AS device,
			COUNT(*)::int AS requests
		FROM telemetry_events
		WHERE kind = 'request' AND created_at >= ${since}
		GROUP BY 1, 2
	`);

	const byAccountType = new Map<string, number>();
	const byDevice = new Map<string, number>();
	for (const row of breakdown) {
		const count = Number(row.requests);
		const type = String(row.account_type);
		const device = String(row.device);
		byAccountType.set(type, (byAccountType.get(type) ?? 0) + count);
		byDevice.set(device, (byDevice.get(device) ?? 0) + count);
	}
	const sorted = (map: Map<string, number>) =>
		[...map].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);

	return {
		range,
		ranges: Object.keys(RANGES) as Range[],
		bucket,
		retentionDays: TELEMETRY_RETENTION_DAYS,
		summary: {
			requests: Number(summary?.requests ?? 0),
			serverErrors: Number(summary?.server_errors ?? 0),
			clientErrors: Number(summary?.client_errors ?? 0),
			p50: num(summary?.p50),
			p95: num(summary?.p95),
			crashes: Number(errorCounts?.crashes ?? 0),
			browserErrors: Number(errorCounts?.browser_errors ?? 0)
		},
		timeline: timeline.map((row) => ({
			bucket: new Date(row.bucket as string).toISOString(),
			requests: Number(row.requests),
			errors: Number(row.errors),
			p95: num(row.p95)
		})),
		routes: routes.map((row) => ({
			route: row.route as string | null,
			requests: Number(row.requests),
			errors: Number(row.errors),
			p50: num(row.p50),
			p95: num(row.p95)
		})),
		vitals: VITAL_NAMES.map((name) => {
			const row = vitals.find((item) => item.name === name);
			return { name, samples: Number(row?.samples ?? 0), p75: num(row?.p75) };
		}),
		slowPages: slowPages.map((row) => ({
			route: row.route as string | null,
			samples: Number(row.samples),
			p75: num(row.p75)
		})),
		errors: errorGroups.map((row) => ({
			kind: row.kind as 'server_error' | 'client_error',
			message: String(row.message ?? ''),
			route: row.route as string | null,
			status: num(row.status),
			occurrences: Number(row.occurrences),
			lastSeen: new Date(row.last_seen as string).toISOString(),
			errorId: row.error_id as string | null,
			stack: row.stack as string | null
		})),
		byAccountType: sorted(byAccountType),
		byDevice: sorted(byDevice)
	};
};
