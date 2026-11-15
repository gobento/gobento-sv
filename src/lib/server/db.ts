// src/lib/server/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$app/env/private';
import { isMockEnabled } from './mock';
import type { Database } from './mock/database';
import * as schema from './schema';

/**
 * In mock mode without a DATABASE_URL the app runs on an in-process Postgres
 * (PGlite) filled with demo data, so it needs no external services at all.
 * The instance lives on globalThis to survive dev-server module reloads.
 */
async function mockDatabase(): Promise<Database> {
	const key = Symbol.for('gobento.mock.db');
	const store = globalThis as typeof globalThis & { [key]?: Promise<Database> };
	store[key] ??= (async () => {
		const [{ createMockDatabase }, { seedMockDatabase }] = await Promise.all([
			import('./mock/database'),
			import('./mock/seed')
		]);
		const { db } = await createMockDatabase();
		await seedMockDatabase(db);
		return db;
	})();
	// A failed start must not be cached, or every later reload would replay it.
	store[key].catch(() => delete store[key]);
	return store[key];
}

export const usesMockDatabase = isMockEnabled() && !DATABASE_URL;

export const db: Database = usesMockDatabase
	? await mockDatabase()
	: drizzle(postgres(DATABASE_URL), { schema });
