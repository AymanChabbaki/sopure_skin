import { createHash } from 'node:crypto';

/**
 * Meta Conversions API: sends each order to Meta from the server, so it is counted even when the
 * Pixel is blocked (ad blockers, iOS). The browser Pixel sends the same Purchase with the same
 * event_id ("purchase-<order number>"), and Meta keeps only one of the two.
 * Customer data is normalized and SHA-256 hashed before it leaves the server, as Meta requires.
 * Needs META_CAPI_TOKEN (Cloudflare secret); without it nothing is sent.
 */
const PIXEL_ID = () => process.env.META_PIXEL_ID || '1680885362620185';
const API_VERSION = 'v21.0';

const sha = (value) => (value ? createHash('sha256').update(value).digest('hex') : undefined);
const clean = (value) => String(value ?? '').trim().toLowerCase();

/** Moroccan phone in international digits: "06 12 34 56 78" -> "212612345678" */
export function normalizePhone(phone) {
  let digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `212${digits.slice(1)}`;
  else if (digits.length === 9) digits = `212${digits}`;
  return digits || undefined;
}

function cookie(req, name) {
  const match = (req.headers.cookie || '').match(new RegExp(`(?:^|;\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function purchaseEvent(req, data, order) {
  const [firstName, ...rest] = clean(data.customerName).split(/\s+/);
  const lastName = rest.join('');
  const userData = {
    ph: [sha(normalizePhone(data.phone))].filter(Boolean),
    em: data.email ? [sha(clean(data.email))] : undefined,
    fn: firstName ? [sha(firstName)] : undefined,
    ln: lastName ? [sha(lastName)] : undefined,
    ct: [sha(clean(data.city).replace(/[^a-z؀-ۿ]/g, ''))].filter(Boolean),
    country: [sha('ma')],
    external_id: [sha(normalizePhone(data.phone))].filter(Boolean),
    client_ip_address: req.headers['cf-connecting-ip'] || req.ip,
    client_user_agent: req.headers['user-agent'],
    fbp: cookie(req, '_fbp'),
    fbc: cookie(req, '_fbc'),
  };
  return {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: `purchase-${order.number}`,
    action_source: 'website',
    event_source_url: req.headers.referer || undefined,
    user_data: Object.fromEntries(Object.entries(userData).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length))),
    custom_data: {
      currency: 'MAD',
      value: Number(order.total) || 0,
      order_id: order.number,
      content_type: 'product',
      content_ids: (order.products || []).map((p) => String(p.sku)),
      num_items: Number(order.items_count) || undefined,
    },
  };
}

/** Never throws and is bounded in time: tracking must not slow down or break the checkout. */
export async function sendMetaEvents(events) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return;
  try {
    const body = { data: events };
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PIXEL_ID()}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error('Meta CAPI error:', res.status, (await res.text()).slice(0, 300));
  } catch (err) {
    console.error('Meta CAPI failed:', err.message);
  }
}
