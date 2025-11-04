// src/lib/server/mail/sendMailWithAttachments.ts
import nodemailer from 'nodemailer';
import { MAIL_USER, MAIL_PASS } from '$env/static/private';

export async function sendEmailWithAttachment(
	to: string,
	subject: string,
	body: string,
	pdfBuffer: Buffer,
	filename = 'receipt.pdf'
) {
	const transporter = nodemailer.createTransport({
		host: 'smtp.resend.com',
		secure: true,
		port: 465,
		auth: {
			user: MAIL_USER,
			pass: MAIL_PASS
		}
	});

	await transporter.sendMail({
		from: `"GoBento Payments" <${MAIL_USER}>`,
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
