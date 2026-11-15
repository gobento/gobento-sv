// Link previews for shared offers and locations.
//
// Those pages sit behind the sign-in, so a chat app or social network fetching a
// shared link would only ever see the login page's generic card. Known preview
// crawlers get a tiny page carrying the real title, description and photo instead;
// people keep getting the normal app (and its sign-in redirect).
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db.js';
import { businessLocations, businessOffers, businessProfiles, files } from '#lib/server/schema.js';
import { getSignedDownloadUrl } from '#lib/server/backblaze.js';
import { priceWithMargin } from '#lib/server/payments/currency.js';
import { inviteCard } from '#lib/server/og/invite.js';

const PREVIEW_BOTS =
	// Crawler names only: in-app browsers (Pinterest, Snapchat, ...) carry their app's
	// name in the user agent too, and must get the real app.
	/facebookexternalhit|facebot|twitterbot|telegrambot|whatsapp|slackbot|discordbot|linkedinbot|skypeuripreview|pinterestbot|redditbot|embedly|mastodon|bluesky|applebot|googlebot|bingbot|signal|iframely|vkshare|snap url preview/i;

export function isPreviewBot(userAgent: string | null): boolean {
	return !!userAgent && PREVIEW_BOTS.test(userAgent);
}

interface Preview {
	title: string;
	description: string;
	image: string;
	imageAlt: string;
	type: string;
}

async function imageUrl(fileId: string | null | undefined): Promise<string | null> {
	if (!fileId) return null;
	const [file] = await db
		.select({ key: files.key })
		.from(files)
		.where(eq(files.id, fileId))
		.limit(1);
	return file ? await getSignedDownloadUrl(file.key) : null;
}

async function offerPreview(id: string, origin: string): Promise<Preview | null> {
	const [row] = await db
		.select({
			name: businessOffers.name,
			description: businessOffers.description,
			price: businessOffers.price,
			originalValue: businessOffers.originalValue,
			imageId: businessOffers.imageId,
			locationImageId: businessLocations.imageId,
			city: businessLocations.city,
			businessName: businessProfiles.name,
			logoId: businessProfiles.profilePictureId
		})
		.from(businessOffers)
		.leftJoin(businessLocations, eq(businessOffers.locationId, businessLocations.id))
		.innerJoin(businessProfiles, eq(businessProfiles.accountId, businessOffers.businessAccountId))
		.where(eq(businessOffers.id, id))
		.limit(1);
	if (!row) return null;

	const price = priceWithMargin(row.price);
	const savings = row.originalValue > price ? Math.round((1 - price / row.originalValue) * 100) : 0;
	const image =
		(await imageUrl(row.imageId)) ??
		(await imageUrl(row.locationImageId)) ??
		(await imageUrl(row.logoId)) ??
		`${origin}/og.png`;

	return {
		title: savings > 0 ? `${row.name} - Save ${savings}%` : row.name,
		description:
			row.description ||
			`${row.name} from ${row.businessName}${row.city ? ` in ${row.city}` : ''}. Rescue surplus food and save money with GoBento.`,
		image,
		imageAlt: `${row.name} at ${row.businessName}`,
		type: 'product'
	};
}

async function locationPreview(id: string, origin: string): Promise<Preview | null> {
	const [row] = await db
		.select({
			name: businessLocations.name,
			city: businessLocations.city,
			imageId: businessLocations.imageId,
			businessName: businessProfiles.name,
			logoId: businessProfiles.profilePictureId
		})
		.from(businessLocations)
		.innerJoin(
			businessProfiles,
			eq(businessProfiles.accountId, businessLocations.businessAccountId)
		)
		.where(eq(businessLocations.id, id))
		.limit(1);
	if (!row) return null;

	const image = (await imageUrl(row.imageId)) ?? (await imageUrl(row.logoId)) ?? `${origin}/og.png`;
	const title =
		row.name && row.name !== row.businessName
			? `${row.businessName} - ${row.name}`
			: row.businessName;

	return {
		title,
		description: `Rescue surplus food from ${row.businessName}${row.city ? ` in ${row.city}` : ''} on GoBento.`,
		image,
		imageAlt: `${row.businessName} location`,
		type: 'business.business'
	};
}

const escape = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A crawler-only page for /, /offers/:id and /locations/:id, or null for anything else. */
export async function linkPreviewResponse(url: URL): Promise<Response | null> {
	let preview: Preview | null;
	const invite = url.searchParams.get('invite');
	const reservationPath = /^\/reservations\/[^/]+\/?$/.test(url.pathname);
	if (reservationPath && invite) {
		// A pickup invite: the card shows what to collect, where and when.
		const card = await inviteCard(invite);
		if (!card) return null;
		preview = {
			title: `Can you pick up ${card.offerName} for me?`,
			description: `Pickup ${card.pickup} at ${card.businessName}${card.place ? `, ${card.place}` : ''}. It's already paid.`,
			image: `${url.origin}/api/og/invite/${encodeURIComponent(invite)}`,
			imageAlt: `Pickup invite: ${card.offerName}, ${card.pickup}`,
			type: 'website'
		};
	} else if (url.pathname === '/') {
		// `/` only redirects (to the sign-in when signed out); share the brand card.
		preview = {
			title: 'Rescue surplus food near you',
			description: 'Rescue surplus food from local businesses and save money.',
			image: `${url.origin}/og.png`,
			imageAlt: 'GoBento: surplus food, rescued',
			type: 'website'
		};
	} else {
		const match = /^\/(offers|locations)\/([^/]+)\/?$/.exec(url.pathname);
		if (!match) return null;
		preview =
			match[1] === 'offers'
				? await offerPreview(match[2], url.origin)
				: await locationPreview(match[2], url.origin);
	}
	if (!preview) return null;

	// Invite links keep their token, so the preview's link still opens the invite.
	const canonical =
		url.origin + url.pathname + (preview.type === 'website' && invite ? url.search : '');
	// For a person who lands here anyway (an in-app browser that looks like a
	// crawler): `app=1` always gets the real app, never this page.
	const appUrl = new URL(canonical);
	appUrl.searchParams.set('app', '1');
	const appLink = appUrl.href;
	const title = escape(`${preview.title} · GoBento`);
	const description = escape(preview.description);
	const image = escape(new URL(preview.image, url.origin).href);
	const alt = escape(preview.imageAlt);
	// Our own cards are 1200x630; saying so lets chat apps pick the large layout.
	const ownCard =
		preview.image.startsWith(`${url.origin}/api/og/`) || preview.image.endsWith('/og.png');

	const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${escape(canonical)}" />
<meta property="og:type" content="${preview.type}" />
<meta property="og:site_name" content="GoBento" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${escape(canonical)}" />
<meta property="og:image" content="${image}" />
${ownCard ? '<meta property="og:image:width" content="1200" />\n<meta property="og:image:height" content="630" />\n' : ''}<meta property="og:image:alt" content="${alt}" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
<meta name="twitter:image:alt" content="${alt}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:16px;box-sizing:border-box;background:#f6f3ee;color:#1c1530;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{width:100%;max-width:420px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(28,21,48,.12)}
img{display:block;width:100%;aspect-ratio:1200/630;object-fit:cover;background:#eee}
div{padding:20px 22px 24px}h1{margin:0 0 6px;font-size:20px;line-height:1.3}p{margin:0 0 18px;color:#5b5568}
a{display:block;text-align:center;background:#1c1530;color:#fff;text-decoration:none;font-weight:700;padding:14px;border-radius:16px}
@media (prefers-color-scheme:dark){body{background:#14111c;color:#f3f0fa}main{background:#1f1a2b}p{color:#b7b0c6}a{background:#f3f0fa;color:#1c1530}}
</style>
</head>
<body><main><img src="${image}" alt="${alt}" /><div><h1>${title}</h1><p>${description}</p><a href="${escape(appLink)}">Open in GoBento</a></div></main></body>
</html>`;

	return new Response(html, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			// Same URL as the real page, so no shared cache may keep this: a CDN
			// would otherwise serve the bare preview page to every browser.
			'cache-control': 'private, no-store',
			'cdn-cache-control': 'no-store',
			'vercel-cdn-cache-control': 'no-store',
			vary: 'User-Agent'
		}
	});
}
