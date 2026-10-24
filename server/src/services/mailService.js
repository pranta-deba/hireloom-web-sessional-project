import nodemailer from 'nodemailer';
import { getSettings } from './settingsService.js';
import { OTP_HTML, render } from './mailTemplates.js';
import { env } from '../config/env.js';

let transporter = null;
let transporterKey = '';

async function getTransport() {
  const { mail } = await getSettings();
  if (!mail.enabled || !mail.host || !mail.user || !mail.pass) return { transport: null, mail };
  const key = [mail.host, mail.port, mail.secure, mail.user, mail.pass].join('|');
  if (!transporter || key !== transporterKey) {
    transporter = nodemailer.createTransport({
      host: mail.host,
      port: Number(mail.port),
      secure: !!mail.secure,
      auth: { user: mail.user, pass: mail.pass },
    });
    transporterKey = key;
  }
  return { transport: transporter, mail };
}

/** Sends an email, or logs it when SMTP is not configured yet (returns { delivered:false }). */
export async function sendMail({ to, subject, html, text }) {
  const { transport, mail } = await getTransport();
  if (!transport) {
    console.log(`✉  [mail not configured] to=${to} subject="${subject}"`);
    return { delivered: false };
  }
  await transport.sendMail({
    from: `"${mail.fromName || 'HireLoom'}" <${mail.fromEmail || mail.user}>`,
    to,
    subject,
    html,
    text,
  });
  return { delivered: true };
}

export async function verifyTransport(overrides) {
  const { mail } = await getSettings(true);
  const cfg = { ...mail, ...(overrides || {}) };
  const t = nodemailer.createTransport({ host: cfg.host, port: Number(cfg.port), secure: !!cfg.secure, auth: { user: cfg.user, pass: cfg.pass } });
  await t.verify();
  return true;
}

export async function sendWelcomeEmail(user) {
  const s = await getSettings();
  if (!s.mail.sendWelcome || !user.email) return { delivered: false };
  const vars = {
    name: user.name?.split(' ')[0] || user.username,
    username: user.username,
    siteName: s.site.name,
    loginUrl: `${env.clientUrl}/dashboard`,
    year: new Date().getFullYear(),
  };
  return sendMail({
    to: user.email,
    subject: render(s.mail.welcomeSubject, vars),
    html: render(s.mail.welcomeHtml, vars),
  });
}

export async function sendOtpEmail(email, code) {
  const s = await getSettings();
  return sendMail({
    to: email,
    subject: `${code} is your ${s.site.name} verification code`,
    html: render(OTP_HTML, { code, siteName: s.site.name }),
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
  });
}
