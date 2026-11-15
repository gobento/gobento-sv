// src/lib/server/mock/demo-accounts.ts

/** The seeded accounts offered on the demo sign-in screen, one per role. */
export const DEMO_ACCOUNTS = {
	user: 'demo-user',
	business: 'demo-business',
	charity: 'demo-charity',
	moderator: 'demo-moderator',
	admin: 'demo-admin'
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;
