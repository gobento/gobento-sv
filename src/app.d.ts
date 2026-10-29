// src/app.d.ts
/// <reference types="unplugin-icons/types/svelte" />
import type { Account, Session } from '#lib/server/schema.js';

declare global {
	namespace App {
		interface Locals {
			account: Account | null;
			session: Session | null;

			startTimer?: number;
			error?: string;
			errorId?: string;
			errorStackTrace?: string;
			message?: unknown;
			track?: unknown;
		}
		interface Error {
			code?: string;
			errorId?: string;
		}
	}
}

export {};
