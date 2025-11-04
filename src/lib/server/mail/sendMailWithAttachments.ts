// src/lib/server/mail/sendMailWithAttachments.ts
import nodemailer from 'nodemailer';

export async function sendEmailWithAttachment(
	to: string,
	subject: string,
	body: string,
	pdfBuffer: Buffer,
	filename = 'receipt.pdf'
) {
	const transporter = nodemailer.createTransport({
		service: 'gmail', // or SMTP config
		auth: {
			user: process.env.MAIL_USER,
			pass: process.env.MAIL_PASS
		}
	});

	await transporter.sendMail({
		from: `"Payments" <${process.env.MAIL_USER}>`,
		to,
		subject,
		text: body,
		attachments: [
			{
				filename,
				content: pdfBuffer,
				contentType: 'application/pdf'
			}
		]
	});
}
