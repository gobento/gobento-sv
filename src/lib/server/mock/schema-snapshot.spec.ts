// src/lib/server/mock/schema-snapshot.spec.ts
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** drizzle-kit's table order differs between machines, so compare statement sets. */
const statements = (ddl: string) =>
	ddl
		.split(/;\s*(?:--> statement-breakpoint)?\s*\n/)
		.map((statement) => statement.trim())
		.filter(Boolean)
		.sort();

describe('mock schema snapshot', () => {
	it('matches the Drizzle schema (run `bun run db:snapshot` after changing schema.ts)', () => {
		const current = execFileSync('bunx', ['drizzle-kit', 'export', '--sql'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		});
		const snapshot = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
		expect(statements(snapshot)).toEqual(statements(current));
	}, 60_000);
});
