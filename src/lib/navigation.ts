// src/lib/navigation.ts
/**
 * Role-aware navigation, kept free of UI imports so it can be unit tested and
 * shared between the server (home redirect) and the app shell.
 */
export type AccountType = 'user' | 'business' | 'charity' | 'moderator' | 'admin' | 'employee';

export type NavIcon =
	| 'discover'
	| 'bag'
	| 'heart'
	| 'person'
	| 'home'
	| 'tag'
	| 'chart'
	| 'money'
	| 'location'
	| 'warning'
	| 'settings'
	| 'shield';

export interface NavItem {
	path: string;
	label: string;
	icon: NavIcon;
	/** Optional group heading, shown in the sidebar and the "More" sheet only. */
	section?: string;
}

const PROFILE: NavItem = { path: '/profile', label: 'Profile', icon: 'person' };
const SETTINGS: NavItem = { path: '/profile', label: 'Settings', icon: 'settings' };

/** Ordered by importance: the first entries get the mobile tab bar slots. */
const NAVIGATION: Record<AccountType, NavItem[]> = {
	user: [
		{ path: '/discover', label: 'Discover', icon: 'discover' },
		{ path: '/reservations', label: 'Orders', icon: 'bag' },
		{ path: '/favorites', label: 'Favorites', icon: 'heart' },
		PROFILE
	],
	business: [
		{ path: '/dashboard', label: 'Dashboard', icon: 'home', section: 'Overview' },
		{ path: '/offers', label: 'Offers', icon: 'tag', section: 'Selling' },
		{ path: '/locations', label: 'Locations', icon: 'location' },
		{ path: '/transactions', label: 'Payments', icon: 'money', section: 'Insights' },
		{ path: '/analytics', label: 'Analytics', icon: 'chart' },
		{ path: '/charities', label: 'Charities', icon: 'heart', section: 'Organisation' },
		{ path: '/team', label: 'Team', icon: 'person' },
		{ path: '/complaints', label: 'Complaints', icon: 'warning' },
		SETTINGS
	],
	charity: [
		{ path: '/donations', label: 'Donations', icon: 'heart', section: 'Collecting' },
		{ path: '/discover', label: 'Discover', icon: 'discover' },
		{ path: '/reservations', label: 'Pickups', icon: 'bag' },
		{ path: '/team', label: 'Team', icon: 'person', section: 'Organisation' },
		SETTINGS
	],
	// Staff of a business or charity: the counter / collection view only.
	employee: [{ path: '/shift', label: 'Shift', icon: 'bag' }, SETTINGS],
	moderator: [{ path: '/moderation', label: 'Moderation', icon: 'shield' }, SETTINGS],
	admin: [
		{ path: '/admin', label: 'Overview', icon: 'home' },
		{ path: '/admin/accounts', label: 'Accounts', icon: 'person' },
		{ path: '/admin/payments', label: 'Payments', icon: 'money' },
		{ path: '/admin/telemetry', label: 'Telemetry', icon: 'chart' },
		{ path: '/moderation', label: 'Moderation', icon: 'shield' },
		SETTINGS
	]
};

/** How many destinations fit in the phone tab bar before a "More" tab is needed. */
export const TAB_BAR_SLOTS = 5;

export function navigationFor(accountType: string | null | undefined): NavItem[] {
	return NAVIGATION[accountType as AccountType] ?? NAVIGATION.user;
}

/** Landing page after sign-in and for `/`. */
export function homeFor(accountType: string | null | undefined): string {
	return navigationFor(accountType)[0].path;
}

/**
 * The nav path that owns `pathname`: an exact match or the deepest ancestor,
 * so `/admin/accounts` lights up "Accounts" rather than "Overview".
 */
export function activePath(items: NavItem[], pathname: string): string | null {
	let best: string | null = null;
	for (const { path } of items) {
		if (pathname !== path && !pathname.startsWith(path + '/')) continue;
		if (best === null || path.length > best.length) best = path;
	}
	return best;
}

/** Split the nav into tab bar items and the overflow shown under "More". */
export function splitForTabBar(items: NavItem[]): { tabs: NavItem[]; overflow: NavItem[] } {
	if (items.length <= TAB_BAR_SLOTS) return { tabs: items, overflow: [] };
	return { tabs: items.slice(0, TAB_BAR_SLOTS - 1), overflow: items.slice(TAB_BAR_SLOTS - 1) };
}

/**
 * Only same-origin paths are safe to redirect to after sign-in; anything else
 * (absolute URLs, protocol-relative `//host`, backslash tricks) falls back.
 */
export function safeRedirectPath(next: string | null | undefined, fallback = '/'): string {
	if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
		return fallback;
	}
	return next;
}
