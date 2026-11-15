import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { inviteCard } from '#lib/server/og/invite.js';
import { renderInviteImage } from '#lib/server/og/inviteImage.js';

/** Link-preview image for a pickup invite; the default card once the invite is no longer open. */
export const GET: RequestHandler = async ({ params }) => {
	const card = await inviteCard(params.token);
	if (!card) redirect(302, '/og.png');

	const png = await renderInviteImage(card);
	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			// Previews are cached by the chat apps anyway; an hour keeps us cheap.
			'cache-control': 'public, max-age=3600'
		}
	});
};
