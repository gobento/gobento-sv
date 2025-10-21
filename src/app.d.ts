// src/app.d.ts
import type { Account, Session } from '$lib/server/schema';

declare global {
	namespace App {
		interface Locals {
			account: Account | null;
			session: Session | null;
		}
	}
}

export {};
