import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

let cachedTransporter: nodemailer.Transporter | null = null;

export async function getTransporter(): Promise<nodemailer.Transporter> {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const user = process.env.ETHEREAL_USER;
  const pass = process.env.ETHEREAL_PASS;

  if (user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user, pass },
    });
    console.log(`[Mailer] Using configured Ethereal account (${user})`);
  } else {
    // Generate a free test account on Ethereal automatically
    console.log('[Mailer] No Ethereal credentials in .env. Creating test account...');
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[Mailer] Generated test Ethereal account: ${testAccount.user}`);
  }

  return cachedTransporter;
}

export interface SendMailParams {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(params: SendMailParams) {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: `"${params.fromName}" <${params.fromEmail}>`,
    to: params.to,
    subject: params.subject,
    html: params.body,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`[Mailer] Message sent: ${info.messageId}`);
  if (previewUrl) {
    console.log(`[Mailer] Preview URL: ${previewUrl}`);
  }

  return { messageId: info.messageId, previewUrl };
}
