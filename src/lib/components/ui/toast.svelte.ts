// src/lib/components/ui/toast.svelte.ts
/**
 * App-wide toast queue. Call `toast.success('Saved')` from anywhere on the
 * client; the single <Toaster /> in the root layout renders the queue.
 */
export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
	id: number;
	kind: ToastKind;
	message: string;
}

const DEFAULT_DURATION = 3500;
const MAX_VISIBLE = 3;

let nextId = 1;
let items = $state<ToastItem[]>([]);
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function dismiss(id: number) {
	clearTimeout(timers.get(id));
	timers.delete(id);
	items = items.filter((item) => item.id !== id);
}

function show(kind: ToastKind, message: string, duration = DEFAULT_DURATION): number {
	const id = nextId++;
	items = [...items, { id, kind, message }];
	// Oldest toasts make room when the stack is full.
	for (const extra of items.slice(0, Math.max(0, items.length - MAX_VISIBLE))) dismiss(extra.id);
	if (duration > 0)
		timers.set(
			id,
			setTimeout(() => dismiss(id), duration)
		);
	return id;
}

export const toast = {
	get items() {
		return items;
	},
	show,
	dismiss,
	success: (message: string, duration?: number) => show('success', message, duration),
	error: (message: string, duration?: number) => show('error', message, duration ?? 6000),
	info: (message: string, duration?: number) => show('info', message, duration),
	clear() {
		for (const item of items) dismiss(item.id);
	}
};
