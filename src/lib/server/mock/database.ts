// src/lib/server/mock/database.ts
/**
 * In-process Postgres for mock mode and automated tests.
 *
 * PGlite is real Postgres compiled to WASM, so the exact same Drizzle queries
 * run against it as against the production database. Nothing is persisted:
 * every process starts from an empty schema (plus, optionally, the demo seed).
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../schema';
// Full DDL for the current Drizzle schema. Regenerate with `bun run db:snapshot`
// after changing schema.ts; schema-snapshot.spec.ts fails when it is stale.
import ddl from './schema.sql?raw';

export type Database = PostgresJsDatabase<typeof schema>;

export interface MockDatabase {
	db: Database;
	/** Release the WASM instance (used by tests). */
	close: () => Promise<void>;
}

/** Create an empty database that has the current schema. */
export async function createMockDatabase(): Promise<MockDatabase> {
	const client = new PGlite();

	await client.exec(ddl);

	const pglite = drizzle(client, { schema });

	// postgres-js resolves `db.execute()` to the row array itself, PGlite to a
	// `{ rows }` envelope. Normalise to the production shape.
	const execute = pglite.execute.bind(pglite);
	Object.assign(pglite, {
		execute: async (query: Parameters<typeof execute>[0]) => (await execute(query)).rows
	});

	return {
		db: pglite as unknown as Database,
		close: () => client.close()
	};
}
