import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.emailHost,
  port: config.emailPort,
  secure: config.emailPort === 465,
  auth: {
    user: config.emailUser,
    pass: config.emailPass,
  },
});

export async function sendPasswordResetEmail(email: string, code: string) {
  if (!config.emailHost || !config.emailUser || !config.emailPass) {
    console.warn('Email configuration is incomplete. Password reset code:', code);
    return;
  }

  await transporter.sendMail({
    from: config.emailUser,
    to: email,
    subject: 'Password reset code for Office Inventory System',
    text: `Your password reset code is ${code}. It expires in 15 minutes.`,
    html: `<p>Your password reset code is <strong>${code}</strong>.</p><p>It expires in 15 minutes.</p>`,
  });
}
