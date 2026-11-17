// src/lib/server/mock/schema-snapshot.spec.ts
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('mock schema snapshot', () => {
	it('matches the Drizzle schema (run `bun run db:snapshot` after changing schema.ts)', () => {
		const current = execFileSync('bunx', ['drizzle-kit', 'export', '--sql'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		});
		const snapshot = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
		expect(snapshot.trim()).toBe(current.trim());
	}, 60_000);
});
