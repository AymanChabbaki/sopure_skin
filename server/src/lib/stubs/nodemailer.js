// Cloudflare Workers build only (wrangler.jsonc "alias"): nodemailer needs node:net.
// On Workers, lib/mailer.js sends SMTP through worker-mailer instead.
export default {
  createTransport() {
    throw new Error('nodemailer is not used on Cloudflare Workers (see lib/mailer.js)');
  },
};
