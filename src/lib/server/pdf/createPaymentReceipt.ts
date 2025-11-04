// src/lib/server/pdf/createPaymentReceipt.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Payment, Account, BusinessOffer } from '$lib/server/schema';

interface PaymentReceiptOptions {
	payment: Payment;
	user: Account;
	business: Account;
	offer: BusinessOffer;
	logoBytes?: Uint8Array; // optional brand logo
}

export async function createPaymentReceipt({
	payment,
	user,
	business,
	offer,
	logoBytes
}: PaymentReceiptOptions) {
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([595.28, 841.89]); // A4
	const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
	const { width, height } = page.getSize();

	// 🎨 Colors & layout helpers
	const theme = {
		primary: rgb(0.16, 0.38, 0.65),
		text: rgb(0.2, 0.2, 0.2),
		gray: rgb(0.7, 0.7, 0.7),
		bg: rgb(0.96, 0.97, 0.99)
	};

	// background bar
	page.drawRectangle({
		x: 0,
		y: height - 120,
		width,
		height: 120,
		color: theme.primary
	});

	// Logo if provided
	if (logoBytes) {
		try {
			const png = await pdfDoc.embedPng(logoBytes);
			const scaled = png.scale(0.2);
			page.drawImage(png, { x: 40, y: height - 100, width: scaled.width, height: scaled.height });
		} catch {
			/* ignore bad logo */
		}
	}

	// Header title
	page.drawText('Payment Receipt', {
		x: 200,
		y: height - 70,
		size: 28,
		font: fontBold,
		color: rgb(1, 1, 1)
	});

	// Subheader (receipt id)
	page.drawText(`Receipt ID: ${payment.id}`, {
		x: 200,
		y: height - 95,
		size: 10,
		font: fontRegular,
		color: rgb(1, 1, 1)
	});

	// Content box
	page.drawRectangle({
		x: 40,
		y: 100,
		width: width - 80,
		height: height - 180,
		borderColor: theme.gray,
		borderWidth: 0.5,
		color: theme.bg
	});

	// Payment info
	let y = height - 160;
	const lineGap = 20;
	const drawLine = (label: string, value: string) => {
		page.drawText(label, { x: 60, y, size: 12, font: fontBold, color: theme.text });
		page.drawText(value, { x: 200, y, size: 12, font: fontRegular, color: theme.text });
		y -= lineGap;
	};

	drawLine('Date:', new Date(payment.createdAt).toLocaleString());
	drawLine('Status:', payment.status.toUpperCase());
	drawLine('User:', user.email);
	drawLine('Business:', business.email);
	drawLine('Offer:', offer.name);
	drawLine('Amount:', `${payment.amount.toFixed(2)} ${payment.currency}`);
	drawLine('Fee:', `${payment.feeAmount.toFixed(2)} ${payment.currency}`);
	drawLine('Business Receives:', `${payment.businessAmount.toFixed(2)} ${payment.currency}`);
	drawLine('Payment Method:', payment.paymentMethod.toUpperCase());
	if (payment.ibanReference) drawLine('IBAN Reference:', payment.ibanReference);
	if (payment.tetherTxHash) drawLine('Tether Tx Hash:', payment.tetherTxHash);

	// Footer note
	page.drawText('Thank you for your payment!', {
		x: 60,
		y: 120,
		size: 12,
		font: fontRegular,
		color: theme.gray
	});

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}
