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

const PREVIEW_BOTS =
	/facebookexternalhit|facebot|twitterbot|telegrambot|whatsapp|slackbot|discordbot|linkedinbot|skypeuripreview|pinterest|redditbot|embedly|mastodon|bluesky|applebot|googlebot|bingbot|signal|iframely|vkshare|snapchat/i;

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
	if (url.pathname === '/') {
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

	const canonical = url.origin + url.pathname;
	const title = escape(`${preview.title} · GoBento`);
	const description = escape(preview.description);
	const image = escape(new URL(preview.image, url.origin).href);
	const alt = escape(preview.imageAlt);

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
<meta property="og:image:alt" content="${alt}" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
<meta name="twitter:image:alt" content="${alt}" />
</head>
<body><h1>${title}</h1><p>${description}</p><a href="${escape(canonical)}">Open in GoBento</a></body>
</html>`;

	return new Response(html, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			// Signed image URLs last a week; let previews cache for a day.
			'cache-control': 'public, max-age=86400'
		}
	});
}
