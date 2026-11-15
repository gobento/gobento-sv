// src/lib/server/pdf/createPaymentReceipt.ts
//
// The customer's payment receipt, drawn to look like the app in light mode:
// warm page, white rounded cards, Nunito, the purple accent and the same
// "order card" as the checkout (dashed rule above the total).
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Payment, Account, BusinessOffer, Reservation } from '#lib/server/schema.js';
import nunitoRegularUrl from './fonts/Nunito-Regular.ttf?inline';
import nunitoBoldUrl from './fonts/Nunito-ExtraBold.ttf?inline';
import harmattanUrl from './fonts/Harmattan-Regular.ttf?inline';
import iconUrl from '../../../../static/icon-192.png?inline';

interface PaymentReceiptOptions {
	payment: Payment;
	user: Account;
	offer: BusinessOffer;
	businessName: string;
	reservation?: Reservation | null;
}

// The light theme's colours (src/app.css, converted from OKLCH).
const C = {
	page: rgb(0.969, 0.954, 0.924), // base-200
	card: rgb(0.996, 0.989, 0.975), // base-100
	border: rgb(0.909, 0.888, 0.844), // base-300
	band: rgb(0.981, 0.97, 0.948), // base-200 at 60% over the card, like `bg-base-200/60`
	text: rgb(0.14, 0.128, 0.212), // base-content
	muted: rgb(0.47, 0.46, 0.53), // base-content at ~60%
	faint: rgb(0.6, 0.59, 0.64), // base-content at ~45%
	primary: rgb(0.384, 0.265, 0.801),
	primarySoft: rgb(0.927, 0.925, 1),
	secondary: rgb(0.85, 0.42, 0.12), // savings orange, a touch darker for print
	success: rgb(0.054, 0.628, 0.324),
	successSoft: rgb(0.861, 0.968, 0.885)
};

const METHOD_LABELS: Record<string, string> = {
	iban: 'Card or bank payment',
	tether: 'Tether (USDT)'
};

const fromDataUrl = (url: string) => Uint8Array.from(Buffer.from(url.split(',')[1], 'base64'));

/** Latin digits throughout: they render in every font and never get reordered. */
function money(amount: number, currency: string): string {
	if (currency === 'USDT') return `${amount.toFixed(2)} USDT`;
	if (currency === 'IRR') return `${new Intl.NumberFormat('en-US').format(amount)} Toman`;
	return new Intl.NumberFormat('de-DE', { style: 'currency', currency })
		.format(amount)
		.replace(/[  ]/g, ' ');
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit'
});
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const dayFormat = new Intl.DateTimeFormat('en-GB', {
	weekday: 'short',
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});

const ARABIC_SCRIPT = /[؀-ۿﭐ-﷿ﹰ-﻿]/;

/** Rounded rectangle; (x, top) is the top-left corner in PDF coordinates. */
function roundedRect(
	page: PDFPage,
	x: number,
	top: number,
	w: number,
	h: number,
	r: number,
	opts: { color?: RGB; borderColor?: RGB; borderWidth?: number }
) {
	const path =
		`M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} ` +
		`H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
	page.drawSvgPath(path, { x, y: top, ...opts });
}

export async function createPaymentReceipt({
	payment,
	user,
	offer,
	businessName,
	reservation
}: PaymentReceiptOptions) {
	const pdf = await PDFDocument.create();
	pdf.registerFontkit(fontkit);
	pdf.setTitle(`GoBento receipt · ${offer.name}`);
	pdf.setAuthor('GoBento');

	const regular = await pdf.embedFont(fromDataUrl(nunitoRegularUrl), { subset: true });
	const bold = await pdf.embedFont(fromDataUrl(nunitoBoldUrl), { subset: true });
	// Persian names (shops, offers) need an Arabic-script font; only embed it then.
	const needsArabic = [offer.name, businessName].some((t) => ARABIC_SCRIPT.test(t));
	const arabic = needsArabic
		? await pdf.embedFont(fromDataUrl(harmattanUrl), { subset: true })
		: null;
	const icon = await pdf.embedPng(fromDataUrl(iconUrl));

	const page = pdf.addPage([595.28, 841.89]); // A4
	const { width, height } = page.getSize();
	const M = 48; // page margin
	const CW = width - M * 2; // card width
	const P = 24; // card padding

	const fontFor = (text: string, font: PDFFont) =>
		arabic && ARABIC_SCRIPT.test(text) ? arabic : font;

	/** Draws text, shortening it with an ellipsis to fit `maxWidth`. */
	const text = (
		value: string,
		x: number,
		y: number,
		size: number,
		font: PDFFont,
		color: RGB,
		opts: { maxWidth?: number; align?: 'left' | 'right'; spacing?: number } = {}
	) => {
		const f = fontFor(value, font);
		let s = value;
		if (opts.maxWidth) {
			while (s.length > 1 && f.widthOfTextAtSize(s, size) > opts.maxWidth) s = s.slice(0, -1);
			if (s !== value) s = s.trimEnd() + '…';
		}
		const spacing = opts.spacing ?? 0;
		const w = f.widthOfTextAtSize(s, size) + spacing * s.length;
		let cx = opts.align === 'right' ? x - w : x;
		if (!spacing) {
			page.drawText(s, { x: cx, y, size, font: f, color });
			return w;
		}
		// pdf-lib has no letter-spacing option: place the (Latin) glyphs one by one.
		for (const ch of s) {
			page.drawText(ch, { x: cx, y, size, font: f, color });
			cx += f.widthOfTextAtSize(ch, size) + spacing;
		}
		return w;
	};

	const eyebrow = (value: string, x: number, y: number) =>
		text(value.toUpperCase(), x, y, 8.5, bold, C.faint, { spacing: 0.9 });

	// Page background
	page.drawRectangle({ x: 0, y: 0, width, height, color: C.page });

	// Brand row
	let y = height - M;
	page.drawImage(icon, { x: M, y: y - 34, width: 34, height: 34 });
	text('Go', M + 44, y - 25, 20, bold, C.text);
	text('Bento', M + 44 + bold.widthOfTextAtSize('Go', 20), y - 25, 20, bold, C.primary);
	eyebrow('Receipt', width - M - bold.widthOfTextAtSize('RECEIPT', 8.5) - 0.9 * 7, y - 12);
	text(
		dateFormat.format(new Date(payment.completedAt ?? payment.createdAt)),
		width - M,
		y - 28,
		10,
		regular,
		C.muted,
		{
			align: 'right'
		}
	);

	// Paid badge + headline
	y -= 82;
	const badge = 'Paid';
	const badgeW = bold.widthOfTextAtSize(badge, 10) + 26;
	roundedRect(page, M, y + 6, badgeW, 22, 11, { color: C.successSoft });
	page.drawCircle({ x: M + 11, y: y - 5, size: 3, color: C.success });
	text(badge, M + 18, y - 8.5, 10, bold, C.success);
	y -= 46;
	text('Thanks for rescuing food!', M, y, 26, bold, C.text, { maxWidth: CW });

	// Order card (mirrors the checkout's order summary)
	y -= 28;
	const pickup = reservation
		? `${dayFormat.format(reservation.pickupFrom)}, ${timeFormat.format(reservation.pickupFrom)}–${timeFormat.format(reservation.pickupUntil)}`
		: null;
	const rows = 1 + (pickup ? 1 : 0);
	const orderBodyH = P + 12 + 28 + rows * 20 + 10;
	const totalH = 70;
	const cardTop = y;
	roundedRect(page, M, cardTop, CW, orderBodyH + totalH, 18, {
		color: C.card,
		borderColor: C.border,
		borderWidth: 0.8
	});

	let cy = cardTop - P - 8;
	eyebrow('Your order', M + P, cy);
	cy -= 28;
	text(offer.name, M + P, cy, 18, bold, C.text, { maxWidth: CW - P * 2 });
	cy -= 26;
	const row = (label: string, value: string) => {
		text(label, M + P, cy, 10, regular, C.muted);
		text(value, M + P + 90, cy, 11, bold, C.text, { maxWidth: CW - P * 2 - 90 });
		cy -= 20;
	};
	row('From', businessName);
	if (pickup) row('Pickup', pickup);

	// Total band: dashed rule, tinted footer, big amount on the right
	const bandTop = cardTop - orderBodyH;
	// Rounded at the bottom (follows the card), square where it meets the rule.
	roundedRect(page, M + 0.8, bandTop, CW - 1.6, totalH - 0.8, 17, { color: C.band });
	page.drawRectangle({ x: M + 0.8, y: bandTop - 20, width: CW - 1.6, height: 20, color: C.band });
	page.drawLine({
		start: { x: M + 1, y: bandTop },
		end: { x: M + CW - 1, y: bandTop },
		thickness: 0.8,
		color: C.border,
		dashArray: [4, 3]
	});
	text('Total paid', M + P, bandTop - 30, 11, bold, C.muted);
	if (offer.originalValue > payment.amount && payment.currency !== 'USDT') {
		text(
			`You saved ${money(offer.originalValue - payment.amount, payment.currency)}`,
			M + P,
			bandTop - 47,
			9.5,
			bold,
			C.secondary
		);
	}
	text(money(payment.amount, payment.currency), M + CW - P, bandTop - 44, 26, bold, C.text, {
		align: 'right'
	});

	// Payment details card
	y = cardTop - orderBodyH - totalH - 18;
	const reference = payment.tetherTxHash ?? payment.ibanReference ?? null;
	const detailRows: [string, string][] = [
		['Payment method', METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod],
		['Billed to', user.email],
		['Receipt no.', payment.id]
	];
	if (payment.paymentMethod === 'tether' && payment.currency !== 'USDT' && payment.amountUsdt) {
		detailRows.splice(1, 0, ['Amount sent', `${payment.amountUsdt.toFixed(2)} USDT`]);
	}
	const refLines = reference
		? Math.ceil(regular.widthOfTextAtSize(reference, 9) / (CW - P * 2 - 120))
		: 0;
	const detailsH = P + 14 + detailRows.length * 22 + (reference ? 10 + refLines * 13 : 0) + P - 8;
	roundedRect(page, M, y, CW, detailsH, 18, {
		color: C.card,
		borderColor: C.border,
		borderWidth: 0.8
	});

	cy = y - P - 8;
	eyebrow('Payment', M + P, cy);
	cy -= 24;
	for (const [label, value] of detailRows) {
		text(label, M + P, cy, 10, regular, C.muted);
		text(value, M + CW - P, cy, 10.5, bold, C.text, { align: 'right', maxWidth: CW - P * 2 - 120 });
		cy -= 22;
	}
	if (reference) {
		text(payment.tetherTxHash ? 'Transaction' : 'Reference', M + P, cy, 10, regular, C.muted);
		// Long hashes wrap onto several right-aligned lines instead of being cut.
		const maxW = CW - P * 2 - 120;
		// Even chunks, so a wrapped hash never leaves a two-character orphan line.
		const lines = Math.max(1, Math.ceil(regular.widthOfTextAtSize(reference, 9) / maxW));
		const chunk = Math.ceil(reference.length / lines);
		for (let i = 0; i < reference.length; i += chunk) {
			text(reference.slice(i, i + chunk), M + CW - P, cy, 9, regular, C.text, { align: 'right' });
			cy -= 13;
		}
	}

	// Footer
	const footY = M - 4;
	page.drawLine({
		start: { x: M, y: footY + 22 },
		end: { x: width - M, y: footY + 22 },
		thickness: 0.6,
		color: C.border
	});
	text('GoBento · Save food, one bento at a time.', M, footY, 9, bold, C.primary);

	return Buffer.from(await pdf.save());
}
