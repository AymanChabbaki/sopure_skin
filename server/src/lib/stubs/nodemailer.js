// Cloudflare Workers build only (wrangler.jsonc "alias"): SMTP connections are not possible there,
// emails go through Resend's HTTPS API (lib/mailer.js).
export default {
  createTransport() {
    throw new Error('SMTP is not available on Cloudflare Workers: set RESEND_API_KEY');
  },
};
