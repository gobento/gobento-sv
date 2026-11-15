// src/lib/server/sso.ts
/**
 * Company single sign-on for staff, via OpenID Connect (Microsoft Entra ID,
 * Okta, Google Workspace, Keycloak, Auth0, …). Each business or charity can
 * register its own identity provider on the Team page.
 *
 * Trust model: an organisation's identity provider can only sign in that
 * organisation's own staff accounts. Whatever it asserts, it never reaches
 * customers, owners or another organisation's staff, so a misconfigured or
 * hostile provider can't take over anyone else's account.
 */
import { OAuth2Client, CodeChallengeMethod, decodeIdToken } from 'arctic';
import { db } from './db';
import { employees, ssoConnections, type SsoConnection } from './schema';
import { eq } from 'drizzle-orm';
import { openSecret } from './secretBox';
import { isOfflineMode } from './mock';

/** The offline demo may talk to a provider on localhost, for local testing only. */
const ALLOW_LOCAL = isOfflineMode();
const isLocal = (url: URL) => ALLOW_LOCAL && url.protocol === 'http:' && url.hostname === 'localhost';

interface Discovery {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	userinfo_endpoint?: string;
}

const discoveryCache = new Map<string, { at: number; value: Discovery }>();
const CACHE_MS = 60 * 60 * 1000;

/** Trims and validates an issuer URL; returns null when it isn't acceptable. */
export function normaliseIssuer(raw: string): string | null {
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		return null;
	}
	if (isLocal(url)) return url.href.replace(/\/+$/, '');
	if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
		return null;
	}
	const host = url.hostname;
	// No IP literals or local names: the server fetches this URL.
	if (
		host === 'localhost' ||
		host.endsWith('.local') ||
		/^[\d.]+$/.test(host) ||
		host.includes(':')
	) {
		return null;
	}
	return url.href.replace(/\/+$/, '');
}

const sameIssuer = (a: string, b: string) => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

function httpsUrl(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' || isLocal(url);
	} catch {
		return false;
	}
}

/** Fetches and checks the provider's discovery document. */
export async function discover(issuer: string): Promise<Discovery> {
	const cached = discoveryCache.get(issuer);
	if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

	const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
		redirect: 'error',
		signal: AbortSignal.timeout(5000),
		headers: { accept: 'application/json' }
	});
	if (!response.ok) throw new Error(`Discovery failed with ${response.status}`);
	const doc = (await response.json()) as Partial<Discovery>;

	// The document must describe exactly this issuer (OIDC Discovery §4.3).
	if (typeof doc.issuer !== 'string' || !sameIssuer(doc.issuer, issuer)) {
		throw new Error('The discovery document belongs to a different issuer');
	}
	if (!httpsUrl(doc.authorization_endpoint) || !httpsUrl(doc.token_endpoint)) {
		throw new Error('The provider is missing its authorization or token endpoint');
	}
	if (doc.userinfo_endpoint !== undefined && !httpsUrl(doc.userinfo_endpoint)) {
		delete doc.userinfo_endpoint;
	}

	const value = doc as Discovery;
	discoveryCache.set(issuer, { at: Date.now(), value });
	return value;
}

export async function connectionFor(employerAccountId: string): Promise<SsoConnection | null> {
	const [row] = await db
		.select()
		.from(ssoConnections)
		.where(eq(ssoConnections.employerAccountId, employerAccountId))
		.limit(1);
	return row ?? null;
}

function client(connection: SsoConnection, redirectUri: string) {
	return new OAuth2Client(
		connection.clientId,
		openSecret(connection.clientSecretEncrypted),
		redirectUri
	);
}

export async function authorizationUrl(
	connection: SsoConnection,
	redirectUri: string,
	flow: { state: string; codeVerifier: string; nonce: string; loginHint: string }
): Promise<URL> {
	const provider = await discover(connection.issuer);
	const url = client(connection, redirectUri).createAuthorizationURLWithPKCE(
		provider.authorization_endpoint,
		flow.state,
		CodeChallengeMethod.S256,
		flow.codeVerifier,
		['openid', 'email', 'profile']
	);
	url.searchParams.set('nonce', flow.nonce);
	url.searchParams.set('login_hint', flow.loginHint);
	url.searchParams.set('prompt', 'select_account');
	return url;
}

export interface CompanyIdentity {
	subject: string;
	email: string | null;
	emailVerified: boolean | null;
}

/**
 * Exchanges the code and validates the ID token's claims. The token comes
 * straight from the provider's token endpoint over TLS with our client
 * secret, which OIDC Core §3.1.3.7 accepts in place of a signature check;
 * issuer, audience, expiry and nonce are still verified.
 */
export async function finishSignIn(
	connection: SsoConnection,
	redirectUri: string,
	code: string,
	codeVerifier: string,
	nonce: string
): Promise<CompanyIdentity> {
	const provider = await discover(connection.issuer);
	const tokens = await client(connection, redirectUri).validateAuthorizationCode(
		provider.token_endpoint,
		code,
		codeVerifier
	);

	const claims = decodeIdToken(tokens.idToken()) as Record<string, unknown>;
	const now = Math.floor(Date.now() / 1000);
	const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];

	if (typeof claims.iss !== 'string' || !sameIssuer(claims.iss, connection.issuer)) {
		throw new Error('ID token from an unexpected issuer');
	}
	if (!audience.includes(connection.clientId)) throw new Error('ID token for another client');
	if (audience.length > 1 && claims.azp !== connection.clientId) {
		throw new Error('ID token authorised for another client');
	}
	if (typeof claims.exp !== 'number' || claims.exp < now - 60) throw new Error('ID token expired');
	if (claims.nonce !== nonce) throw new Error('ID token nonce mismatch');
	if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('ID token without subject');

	let email = typeof claims.email === 'string' ? claims.email : null;
	let emailVerified = typeof claims.email_verified === 'boolean' ? claims.email_verified : null;
	// Entra ID often leaves `email` out but sends the sign-in name.
	if (
		!email &&
		typeof claims.preferred_username === 'string' &&
		claims.preferred_username.includes('@')
	) {
		email = claims.preferred_username;
	}

	if (!email && provider.userinfo_endpoint) {
		const response = await fetch(provider.userinfo_endpoint, {
			headers: { authorization: `Bearer ${tokens.accessToken()}` },
			redirect: 'error',
			signal: AbortSignal.timeout(5000)
		});
		if (response.ok) {
			const info = (await response.json()) as Record<string, unknown>;
			// UserInfo must describe the same person as the ID token (OIDC Core §5.3.2).
			if (info.sub === claims.sub) {
				email = typeof info.email === 'string' ? info.email : null;
				emailVerified = typeof info.email_verified === 'boolean' ? info.email_verified : null;
			}
		}
	}

	return { subject: claims.sub, email: email?.toLowerCase() ?? null, emailVerified };
}

/**
 * True when this account is staff of an organisation that only allows
 * company sign-in, so other sign-in methods must refuse it.
 */
export async function ssoRequiredFor(account: { id: string; accountType: string }): Promise<boolean> {
	if (account.accountType !== 'employee') return false;
	const [row] = await db
		.select({ enabled: ssoConnections.enabled, requireSso: ssoConnections.requireSso })
		.from(employees)
		.innerJoin(ssoConnections, eq(ssoConnections.employerAccountId, employees.employerAccountId))
		.where(eq(employees.accountId, account.id))
		.limit(1);
	return !!row && row.enabled && row.requireSso;
}
