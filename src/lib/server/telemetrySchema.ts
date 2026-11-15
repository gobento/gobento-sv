// src/lib/server/telemetrySchema.ts
import { pgTable, text, integer, real, timestamp, serial, index } from 'drizzle-orm/pg-core';

/**
 * First-party telemetry for the admin dashboard. Rows are keyed by SvelteKit
 * route id (`/offers/[id]`), never by concrete path, and carry the account
 * type only, so no personal data ends up here. Old rows are pruned after
 * `TELEMETRY_RETENTION_DAYS`.
 *
 * - `request`: one per server request (status + duration)
 * - `server_error`: an error that reached `handleError`
 * - `client_error`: an uncaught error or rejection in the browser
 * - `vital`: a browser performance metric (`name` = ttfb | fcp | lcp | cls | inp | nav)
 */
export const telemetryEvents = pgTable(
	'telemetry_events',
	{
		id: serial('id').primaryKey(),
		kind: text('kind', { enum: ['request', 'server_error', 'client_error', 'vital'] }).notNull(),
		route: text('route'),
		method: text('method'),
		status: integer('status'),
		durationMs: integer('duration_ms'),
		name: text('name'),
		value: real('value'),
		message: text('message'),
		stack: text('stack'),
		errorId: text('error_id'),
		accountType: text('account_type'),
		device: text('device', { enum: ['mobile', 'desktop', 'bot'] }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => ({
		kindCreated: index('telemetry_events_kind_created_idx').on(table.kind, table.createdAt)
	})
);

export type TelemetryEvent = typeof telemetryEvents.$inferSelect;
