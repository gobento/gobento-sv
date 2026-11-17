// /vitest.config.ts
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import Icons from 'unplugin-icons/vite';

/**
 * Tests always run fully offline: `$app/env/*` is served from `.env.example`
 * with MOCK on and DATABASE_URL empty, so `#lib/server/db` resolves to the
 * in-process PGlite database seeded with the demo data, payments go to the
 * REST mock and nothing can ever reach a real database or provider.
 */
function testEnv(): Plugin {
	const values: Record<string, string> = {};
	for (const line of readFileSync('.env.example', 'utf8').split('\n')) {
		const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
		if (match) values[match[1]] = match[2];
	}
	Object.assign(values, { MOCK: 'true', MOCK_PAYMENTS: '', DATABASE_URL: '' });

	const source = (pub: boolean) =>
		Object.entries(values)
			.filter(([key]) => key.startsWith('PUBLIC_') === pub)
			.map(([key, value]) => `export const ${key} = ${JSON.stringify(value)};`)
			.join('\n');

	return {
		name: 'test-env',
		enforce: 'pre',
		resolveId(id) {
			if (id === '$app/env/private' || id === '$app/env/public') return `\0${id}`;
		},
		load(id) {
			if (id === '\0$app/env/private') return source(false) + '\n' + source(true);
			if (id === '\0$app/env/public') return source(true);
		}
	};
}

export default defineConfig({
	plugins: [testEnv(), Icons({ compiler: 'svelte' })],
	test: {
		include: ['src/**/*.{test,spec}.ts'],
		environment: 'node',
		// Booting PGlite and seeding it takes a moment on a cold worker.
		hookTimeout: 30_000,
		testTimeout: 15_000
	}
});
