import nodemailer from 'nodemailer';
import { query } from '../db/pool.js';
import { config } from '../config.js';
import { getSettings } from './settings.js';
import { onWorkers } from './runtime.js';

/**
 * Emails sent by the shop (new order alerts). Two transports, without them nothing is sent and orders work the same:
 * - SMTP_HOST / SMTP_USER / SMTP_PASS: classic SMTP (Spacemail: mail.spacemail.com port 465, full address + mailbox
 *   password). Node uses nodemailer; Cloudflare Workers use worker-mailer (TCP sockets, ports 465/587 allowed).
 * - RESEND_API_KEY: Resend's HTTPS API, used instead of SMTP when set.
 */

let transporter;
const resendEnabled = () => Boolean(process.env.RESEND_API_KEY);
const smtpEnabled = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
export const mailEnabled = () => resendEnabled() || smtpEnabled();
export const mailTransport = () => (resendEnabled() ? 'resend' : smtpEnabled() ? 'smtp' : null);

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }
  return transporter;
}

/** Who receives the alerts: ORDER_NOTIFY_EMAIL (comma separated), else the contact email from the admin settings. */
async function recipients() {
  if (process.env.ORDER_NOTIFY_EMAIL) return process.env.ORDER_NOTIFY_EMAIL;
  return (await getSettings()).contact?.email || process.env.SMTP_USER;
}

/** Resend accepts any sender once your domain is verified; before that only onboarding@resend.dev (to your own address). */
const senderAddress = () =>
  process.env.MAIL_FROM || process.env.SMTP_FROM || (resendEnabled() ? 'So Pure Skin <onboarding@resend.dev>' : `So Pure Skin <${process.env.SMTP_USER}>`);

async function sendWithResend({ from, to, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: String(to).split(',').map((s) => s.trim()).filter(Boolean), subject, html, text }),
    signal: AbortSignal.timeout(10000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `Resend HTTP ${res.status}`);
  return body.id;
}

/** "Name <a@b.c>" -> { name, email } */
const parseAddress = (value) => {
  const m = String(value).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || undefined, email: m[2].trim() } : { email: String(value).trim() };
};

/** SMTP from Cloudflare Workers (nodemailer needs node:net, not available there) */
async function sendFromWorker({ from, to, subject, html, text }) {
  const { WorkerMailer } = await import('worker-mailer');
  const port = Number(process.env.SMTP_PORT) || 465;
  const mailer = await WorkerMailer.connect({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    credentials: { username: process.env.SMTP_USER, password: process.env.SMTP_PASS },
    authType: 'plain',
  });
  try {
    await mailer.send({
      from: parseAddress(from),
      to: String(to).split(',').map((s) => s.trim()).filter(Boolean),
      subject,
      html,
      text,
    });
  } finally {
    await mailer.close().catch(() => null);
  }
  return { sent: true };
}

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const dh = (v) => `${new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 2 }).format(Number(v) || 0)} DH`;
const whatsappNumber = (phone) => String(phone).replace(/\D/g, '').replace(/^0/, '212');

export async function sendMail({ to, subject, html, text }) {
  if (!mailEnabled()) return { skipped: true };
  const mail = { from: senderAddress(), to: to || (await recipients()), subject, html, text };
  if (resendEnabled()) return { sent: true, id: await sendWithResend(mail) };
  if (onWorkers) return sendFromWorker(mail);
  const info = await getTransporter().sendMail(mail);
  return { sent: true, id: info.messageId };
}

export function orderEmail(order, items) {
  const adminUrl = `${config.siteUrl}/admin/orders/${order.id}`;
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:10px 10px 10px 0;border-bottom:1px solid #eef2f3;width:48px;vertical-align:middle">
          ${i.image_url ? `<img src="${esc(i.image_url)}" width="48" height="48" alt="" style="display:block;border-radius:8px;background:#f5f1ec;object-fit:contain">` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eef2f3;vertical-align:middle">${esc(i.name)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eef2f3;text-align:center;white-space:nowrap">× ${i.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eef2f3;text-align:right;white-space:nowrap">${dh(i.line_total)}</td>
      </tr>`,
    )
    .join('');
  const line = (label, value) =>
    `<tr><td style="padding:4px 0;color:#6b7c80;width:110px;vertical-align:top">${label}</td><td style="padding:4px 0">${value}</td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f4f8f9;font-family:Arial,Helvetica,sans-serif;color:#13282d">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#269fb7;color:#fff;border-radius:16px 16px 0 0;padding:20px 24px">
      <div style="font-size:13px;opacity:.85">So Pure Skin · nouvelle commande</div>
      <div style="font-size:24px;font-weight:bold;margin-top:4px">${esc(order.number)} · ${dh(order.total)}</div>
    </div>
    <div style="background:#fff;border-radius:0 0 16px 16px;padding:24px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${line('Cliente', `<strong>${esc(order.customer_name)}</strong>`)}
        ${line('Téléphone', `<a href="tel:${esc(order.phone)}" style="color:#1f8aa0">${esc(order.phone)}</a> · <a href="https://wa.me/${whatsappNumber(order.phone)}" style="color:#128C7E">WhatsApp</a>`)}
        ${order.email ? line('Email', esc(order.email)) : ''}
        ${line('Ville', esc(order.city))}
        ${line('Adresse', esc(order.address))}
        ${order.notes ? line('Note', `<em>${esc(order.notes)}</em>`) : ''}
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:18px">${rows}</table>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">
        <tr><td style="padding:3px 0;color:#6b7c80">Sous-total (${order.items_count} produit${order.items_count > 1 ? 's' : ''})</td><td style="text-align:right">${dh(order.subtotal)}</td></tr>
        <tr><td style="padding:3px 0;color:#6b7c80">Livraison</td><td style="text-align:right">${Number(order.shipping_fee) ? dh(order.shipping_fee) : 'Offerte'}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold;font-size:16px">Total à encaisser</td><td style="text-align:right;font-weight:bold;font-size:16px">${dh(order.total)}</td></tr>
      </table>
      <a href="${esc(adminUrl)}" style="display:block;margin-top:22px;background:#13282d;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:999px;font-weight:bold">Voir la commande dans l'admin</a>
      <p style="font-size:12px;color:#6b7c80;margin-top:16px;text-align:center">Paiement à la livraison · pensez à confirmer la commande par téléphone.</p>
    </div>
  </div></body></html>`;

  const text = [
    `Nouvelle commande ${order.number} - ${dh(order.total)}`,
    `Cliente : ${order.customer_name} - ${order.phone}`,
    `Ville : ${order.city} - ${order.address}`,
    order.notes ? `Note : ${order.notes}` : '',
    '',
    ...items.map((i) => `- ${i.name} x${i.quantity} : ${dh(i.line_total)}`),
    '',
    `Livraison : ${Number(order.shipping_fee) ? dh(order.shipping_fee) : 'offerte'}`,
    `Total : ${dh(order.total)}`,
    '',
    adminUrl,
  ]
    .filter((l) => l !== null)
    .join('\n');

  return { subject: `Nouvelle commande ${order.number} · ${dh(order.total)} · ${order.city}`, html, text };
}

/** Emails the shop about a new order. Never throws: a mail problem must not break the checkout. */
export async function notifyNewOrder(orderId) {
  if (!mailEnabled()) return;
  try {
    const { rows: [order] } = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [orderId]);
    const mail = orderEmail(order, items);
    // Bounded so a slow mail server cannot hold the customer's checkout
    await Promise.race([sendMail(mail), new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP timeout')), 12000))]);
  } catch (err) {
    console.error('Order email failed:', err.message);
  }
}
