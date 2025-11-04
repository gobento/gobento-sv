// src/routes/(authorizd)/api/pdf/+server.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// We'll import Node's `fs` and `path` if we use local images
import fs from 'fs';
import path from 'path';

export const GET = async ({ url }) => {
	// 1️⃣ Create PDF
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([595.28, 841.89]); // A4
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

	// 2️⃣ Add text
	page.drawText('Invoice with Logo', {
		x: 50,
		y: 780,
		size: 24,
		font,
		color: rgb(0.2, 0.2, 0.2)
	});

	// 3️⃣ Load image (several options below)

	// ✅ Option A: Load from a local file
	const imagePath = path.resolve('static/icon-192.png'); // put logo in static/
	const imageBytes = fs.readFileSync(imagePath);
	const pngImage = await pdfDoc.embedPng(imageBytes);

	// ✅ Option B: Load from a URL (async fetch)
	// const response = await fetch('https://your-cdn.com/logo.png');
	// const imageBytes = await response.arrayBuffer();
	// const pngImage = await pdfDoc.embedPng(imageBytes);

	// ✅ Option C: Load from a base64 string
	// const base64Data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...";
	// const base64Bytes = Uint8Array.from(atob(base64Data.split(',')[1]), c => c.charCodeAt(0));
	// const pngImage = await pdfDoc.embedPng(base64Bytes);

	// 4️⃣ Draw the image
	const { width, height } = pngImage.scale(0.5); // scale it down
	page.drawImage(pngImage, {
		x: 400,
		y: 750,
		width,
		height
	});

	// 5️⃣ Save PDF
	const pdfBytes = await pdfDoc.save();

	return new Response(pdfBytes, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': 'inline; filename=invoice-with-logo.pdf'
		}
	});
};
