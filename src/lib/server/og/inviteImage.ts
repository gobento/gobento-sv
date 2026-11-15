// Social preview image for a pickup invite: what to collect, where and when.
//
// Laid out with satori (text becomes vector paths from our own fonts, so the
// server needs no installed fonts) and converted to PNG with sharp. Same look
// as the default card in static/og.png.
import satori from 'satori';
import sharp from 'sharp';
import nunitoRegularUrl from '../pdf/fonts/Nunito-Regular.ttf?inline';
import nunitoBoldUrl from '../pdf/fonts/Nunito-ExtraBold.ttf?inline';
import harmattanUrl from '../pdf/fonts/Harmattan-Regular.ttf?inline';
import iconUrl from '../../../../static/icon-512.png?inline';

export interface InviteCard {
	offerName: string;
	businessName: string;
	/** "Rosenthaler Straße 40, Berlin" */
	place: string | null;
	/** "15.11.2026, 20:00–22:00" */
	pickup: string;
}

const fromDataUrl = (url: string) => Buffer.from(url.split(',')[1], 'base64');

let fonts: Parameters<typeof satori>[1]['fonts'] | null = null;
function loadFonts() {
	fonts ??= [
		{ name: 'Nunito', data: fromDataUrl(nunitoRegularUrl), weight: 400, style: 'normal' },
		{ name: 'Nunito', data: fromDataUrl(nunitoBoldUrl), weight: 800, style: 'normal' },
		// Fallback for Persian shop and offer names.
		{ name: 'Harmattan', data: fromDataUrl(harmattanUrl), weight: 400, style: 'normal' }
	];
	return fonts;
}

const C = {
	page: '#f8f5f0',
	text: '#171421',
	muted: '#57534e',
	primary: '#5b3fd6',
	primarySoft: '#ede9fe',
	border: '#e7e0d4',
	green: '#16a34a',
	orange: '#e7a13c'
};

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: (Node | string)[]): Node => ({
	type,
	props: { style, children: children.length === 1 ? children[0] : children }
});

function chip(dot: string, label: string): Node {
	return h(
		'div',
		{
			display: 'flex',
			alignItems: 'center',
			gap: 14,
			background: '#ffffff',
			border: `1px solid ${C.border}`,
			borderRadius: 999,
			padding: '14px 26px',
			fontSize: 28,
			fontWeight: 800,
			color: '#44403c',
			maxWidth: 760
		},
		h('div', { width: 12, height: 12, borderRadius: 999, background: dot, flexShrink: 0 }),
		h('div', { display: 'block', lineClamp: 1 }, label)
	);
}

export async function renderInviteImage(card: InviteCard): Promise<Buffer> {
	const tree = h(
		'div',
		{
			width: 1200,
			height: 630,
			display: 'flex',
			flexDirection: 'column',
			background: C.page,
			fontFamily: 'Nunito, Harmattan',
			color: C.text,
			position: 'relative'
		},
		// Soft blobs, as on the default card
		h('div', {
			position: 'absolute',
			right: -140,
			top: -190,
			width: 560,
			height: 560,
			borderRadius: 999,
			background:
				'radial-gradient(circle at 40% 40%, rgba(91,63,214,0.20), rgba(91,63,214,0.04) 70%)'
		}),
		h('div', {
			position: 'absolute',
			left: -170,
			bottom: -120,
			width: 430,
			height: 430,
			borderRadius: 999,
			background:
				'radial-gradient(circle at 60% 60%, rgba(22,163,74,0.16), rgba(22,163,74,0.03) 70%)'
		}),
		h(
			'div',
			{ display: 'flex', flex: 1, alignItems: 'center', gap: 52, padding: '0 72px' },
			h(
				'div',
				{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					width: 232,
					height: 232,
					flexShrink: 0,
					background: '#ffffff',
					borderRadius: 56,
					boxShadow: '0 24px 48px rgba(23,20,33,0.12)'
				},
				{ type: 'img', props: { src: iconUrl, width: 164, height: 164 } }
			),
			h(
				'div',
				{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 },
				h(
					'div',
					{
						display: 'flex',
						alignSelf: 'flex-start',
						alignItems: 'center',
						gap: 12,
						background: C.primarySoft,
						color: C.primary,
						fontSize: 20,
						fontWeight: 800,
						letterSpacing: 2.5,
						padding: '10px 20px',
						borderRadius: 999
					},
					h('div', { width: 10, height: 10, borderRadius: 999, background: C.green }),
					'PICKUP INVITE'
				),
				h(
					'div',
					{ fontSize: 40, fontWeight: 800, color: C.muted, marginTop: 22 },
					'Can you pick this up for me?'
				),
				h(
					'div',
					{
						display: 'block',
						lineClamp: 2,
						fontSize: 66,
						fontWeight: 800,
						lineHeight: 1.05,
						letterSpacing: -1,
						color: C.primary,
						marginTop: 6
					},
					card.offerName
				),
				h(
					'div',
					{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'flex-start',
						gap: 14,
						marginTop: 30
					},
					chip(C.primary, card.pickup),
					chip(C.orange, card.place ? `${card.businessName} · ${card.place}` : card.businessName)
				)
			)
		),
		h(
			'div',
			{
				display: 'flex',
				alignItems: 'center',
				gap: 14,
				height: 84,
				flexShrink: 0,
				padding: '0 72px',
				background: C.primary,
				color: '#ffffff',
				fontSize: 26,
				fontWeight: 800
			},
			h('div', { width: 12, height: 12, borderRadius: 999, background: '#ffffff' }),
			'GoBento · Save food, one bento at a time.'
		)
	);

	// satori's types expect React elements; plain { type, props } objects are what it reads.
	const svg = await satori(tree as never, { width: 1200, height: 630, fonts: loadFonts() });
	return await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
