import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { listProducts, getProductBySlug, toCard } from '../lib/catalog.js';
import { getSettings } from '../lib/settings.js';
import { HttpError, stripHtml, tr, truncate } from '../lib/utils.js';
import { validate } from '../middleware/errors.js';

export const chatRouter = Router();

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_STEPS = 6;
const LANG_NAMES = { fr: 'French', en: 'English', ar: 'Arabic' };

/* ---------------------------------- Tools ---------------------------------- */

const TOOLS = [
  {
    name: 'search_products',
    description:
      'Search the So Pure Skin catalog. Use it before recommending anything. Combine a free-text query (ingredient, product name, concern like "niacinamide", "acné", "taches") with optional filters.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free text: product name, brand, ingredient or concern' },
        category: { type: 'string', description: 'Category or routine slug from the list in the system prompt' },
        brand: { type: 'string', description: 'Brand slug from the list in the system prompt' },
        max_price: { type: 'number', description: 'Maximum price in MAD' },
        on_sale: { type: 'boolean' },
        sort: { type: 'string', enum: ['popular', 'rating', 'price_asc', 'price_desc', 'newest'] },
        limit: { type: 'integer', minimum: 1, maximum: 8 },
      },
    },
  },
  {
    name: 'get_product',
    description: 'Full details of one product (description, how to use, ingredients, categories, stock, rating).',
    parameters: { type: 'object', properties: { slug_or_id: { type: 'string' } }, required: ['slug_or_id'] },
  },
  {
    name: 'show_products',
    description: 'Display product cards (image, price, add-to-cart button) in the chat. Call it whenever you recommend products, with their ids, best first.',
    parameters: { type: 'object', properties: { product_ids: { type: 'array', items: { type: 'integer' }, maxItems: 6 } }, required: ['product_ids'] },
  },
  {
    name: 'navigate',
    description: 'Open a page of the website for the customer. Only when she asks to see/go somewhere or it clearly helps.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Path WITHOUT language prefix, e.g. /shop, /category/serums, /brand/anua, /product/<slug>, /cart, /checkout, /faq, /shipping, /contact' } },
      required: ['path'],
    },
  },
  {
    name: 'add_to_cart',
    description: 'Add a product to the cart. Only when the customer explicitly asks to add/buy it.',
    parameters: { type: 'object', properties: { product_id: { type: 'integer' }, quantity: { type: 'integer', minimum: 1, maximum: 10 } }, required: ['product_id'] },
  },
  { name: 'open_cart', description: 'Open the cart drawer.', parameters: { type: 'object', properties: {} } },
  {
    name: 'get_order_status',
    description: 'Status of an order. Requires the order number (SPS-...) AND the phone number used for the order.',
    parameters: { type: 'object', properties: { order_number: { type: 'string' }, phone: { type: 'string' } }, required: ['order_number', 'phone'] },
  },
].map((fn) => ({ type: 'function', function: fn }));

const compact = (row, locale) => {
  const card = toCard(row, locale);
  return {
    id: card.id,
    slug: card.slug,
    name: card.name,
    brand: card.brand?.name,
    price_mad: card.price,
    old_price_mad: card.compareAtPrice || undefined,
    rating: card.ratingCount ? `${card.rating}/5 (${card.ratingCount})` : undefined,
    in_stock: card.inStock,
    summary: truncate(stripHtml(card.shortDescription || ''), 90),
  };
};

const digits = (s) => String(s).replace(/\D/g, '').replace(/^212/, '0');

/** Runs one tool call. Server tools return data; client tools also queue an action for the browser. */
async function runTool(name, args, ctx) {
  switch (name) {
    case 'search_products': {
      const { rows } = await listProducts({
        q: args.query,
        category: args.category,
        brand: args.brand,
        maxPrice: args.max_price,
        onSale: args.on_sale,
        sort: args.sort || 'popular',
        limit: Math.min(args.limit || 6, 8),
      });
      // Fallback: a concern keyword rarely matches product names, retry without it but keep filters
      if (!rows.length && args.query && (args.category || args.brand)) {
        return runTool(name, { ...args, query: undefined }, ctx);
      }
      rows.forEach((r) => ctx.seen.set(r.id, r));
      return { count: rows.length, products: rows.map((r) => compact(r, ctx.locale)) };
    }
    case 'get_product': {
      const p = await getProductBySlug(String(args.slug_or_id));
      if (!p?.is_active) return { error: 'Product not found' };
      return {
        ...compact({ ...p, images: [] }, ctx.locale),
        description: truncate(stripHtml(tr(p.description, ctx.locale)), 1200),
        how_to_use: truncate(stripHtml(tr(p.how_to_use, ctx.locale)), 500) || undefined,
        ingredients: truncate(stripHtml(tr(p.ingredients, ctx.locale)), 400) || undefined,
        categories: p.categories.map((c) => tr(c.name, ctx.locale)),
        stock: p.stock,
      };
    }
    case 'show_products': {
      const ids = (args.product_ids || []).slice(0, 6).map(Number).filter(Boolean);
      if (!ids.length) return { error: 'No ids' };
      const { rows } = await listProducts({ ids, limit: ids.length });
      const byId = new Map(rows.map((r) => [r.id, toCard(r, ctx.locale)]));
      ids.forEach((id) => byId.has(id) && !ctx.products.some((p) => p.id === id) && ctx.products.push(byId.get(id)));
      return { shown: ids.filter((id) => byId.has(id)) };
    }
    case 'navigate': {
      const path = `/${String(args.path || '/').replace(/^\/+(fr|en|ar)(?=\/|$)/, '').replace(/^\/+/, '')}`;
      if (!/^\/[a-z0-9\-/?=&.%]*$/i.test(path) || path.startsWith('/admin')) return { error: 'Invalid path' };
      ctx.actions.push({ type: 'navigate', path });
      return { ok: true, opened: path };
    }
    case 'add_to_cart': {
      const { rows } = await listProducts({ ids: [Number(args.product_id)], limit: 1 });
      if (!rows[0]) return { error: 'Product not found' };
      if (rows[0].stock <= 0) return { error: 'Out of stock' };
      ctx.actions.push({ type: 'add_to_cart', product: toCard(rows[0], ctx.locale), quantity: Math.min(Number(args.quantity) || 1, 10) });
      return { ok: true, added: rows[0].id };
    }
    case 'open_cart':
      ctx.actions.push({ type: 'open_cart' });
      return { ok: true };
    case 'get_order_status': {
      const { rows: [o] } = await query(
        'SELECT number, status, phone, total, shipping_fee, city, created_at, items_count FROM orders WHERE upper(number) = upper($1)',
        [String(args.order_number).trim()],
      );
      // The phone must match: order data is private
      if (!o || digits(o.phone) !== digits(args.phone)) return { error: 'No order matches this number and phone' };
      return { number: o.number, status: o.status, total_mad: o.total, shipping_mad: o.shipping_fee, city: o.city, items: o.items_count, ordered_at: o.created_at };
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

/* ------------------------------ System prompt ------------------------------ */

// Kept identical between requests (no per-request data) so Groq can cache it
async function systemPrompt() {
  const s = await getSettings();
  const [{ rows: categories }, { rows: brands }] = await Promise.all([
    query(`SELECT slug, kind FROM categories WHERE is_visible ORDER BY kind, position`),
    query(`SELECT b.slug FROM brands b WHERE EXISTS (SELECT 1 FROM products p WHERE p.brand_id = b.id AND p.is_active) ORDER BY b.slug`),
  ]);
  const sh = s.shipping;
  return `You are Soso, the sweet, caring beauty advisor of So Pure Skin, an online shop of authentic Korean skincare in ${s.contact.city}, Morocco. Slogan: "Filter Snap kimshi, walakin skin care kib9a".

LANGUAGE (most important rule): always answer in the language of the customer's LAST message, whatever the interface language. Moroccan darija in Latin letters (bghit, chno, 3afak, wach, bzaf, mzyan) -> answer in darija with Latin letters and numbers (3, 7, 9). Darija/Arabic script -> answer in Arabic script darija.

STYLE: warm big-sister tone, short answers (2-6 sentences or a short list), no emojis. Never show slugs, ids or technical names to the customer: say "notre routine peau grasse" and use navigate if she wants to see it.

FACTS (never invent others): cash on delivery only. Delivery ${sh.casablancaFee} MAD Casablanca, ${sh.otherFee} MAD other cities, FREE for more than ${sh.freeAboveItems} products. 24-48h Casablanca, 2-4 working days elsewhere. 100% authentic. Human advisor: WhatsApp +${s.contact.whatsapp}. Orders confirmed by phone; numbers look like SPS-YYMMDD-0001.

CATALOG: category slugs: ${categories.filter((c) => c.kind === 'type').map((c) => c.slug).join(', ')}. Routine slugs: ${categories.filter((c) => c.kind === 'routine').map((c) => c.slug).join(', ')}. Brand slugs: ${brands.map((b) => b.slug).join(', ')}.
Never invent products, prices or ingredients: search first (one well-chosen search is usually enough). When recommending, call show_products with 1-4 ids and explain in one line why each fits. Only recommend products whose description really matches the concern (e.g. dark spots: niacinamide, tranexamic acid, vitamin C, arbutin, glutathione); if nothing fits, say so.

SKIN ADVICE: if skin type or concern is unknown, ask one short question. Korean routine: double cleanse at night, toner, serum for the concern, moisturizer, SPF every morning. Patch test new actives, don't mix retinol with AHA/BHA the same night. You are not a doctor: for severe acne, allergies, pregnancy or skin conditions suggest a dermatologist.

ACTIONS: navigate only when asked or clearly useful (e.g. "show me serums" -> /category/serums). add_to_cart only on explicit request. get_order_status needs order number AND phone. Stay on topic (skincare, shop, orders).`;
}

/* ------------------------------ Groq client -------------------------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Free tier = 8k tokens/minute per model. On 429 we fall back to the next model,
 * then wait once for the shortest retry-after and try again.
 */
async function callGroq(messages) {
  const models = [...new Set([process.env.GROQ_MODEL || 'openai/gpt-oss-120b', ...(process.env.GROQ_FALLBACK_MODELS || 'openai/gpt-oss-20b').split(',')])]
    .map((m) => m.trim())
    .filter(Boolean);
  let waitMs = Infinity;

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const model of models) {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
          temperature: 0.5,
          max_completion_tokens: 900,
          ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return (await res.json()).choices[0].message;
      const text = await res.text();
      if (res.status !== 429 && res.status < 500) {
        console.error('Groq error', model, res.status, text.slice(0, 300));
        throw new HttpError(502, 'Assistant unavailable');
      }
      waitMs = Math.min(waitMs, (Number(res.headers.get('retry-after')) || 2) * 1000);
    }
    if (attempt === 0 && waitMs <= 8000) await sleep(waitMs);
    else break;
  }
  throw new HttpError(429, 'Assistant busy');
}

/** gpt-oss sometimes writes a tool call as text: "<|show_products|{"product_ids":[1]}|>". Extract and run them. */
const LEAKED_CALL = /<\|\s*([a-z_]+)\s*\|\s*(\{[\s\S]*?\})\s*\|>/gi;

function extractLeakedCalls(content) {
  const calls = [];
  const text = (content || '').replace(LEAKED_CALL, (_m, name, json) => {
    try {
      calls.push({ name, args: JSON.parse(json) });
    } catch {
      /* ignore malformed */
    }
    return '';
  });
  return { calls, text: text.replace(/\n{3,}/g, '\n\n').trim() };
}

/** Safety net: products the model named in its answer (but forgot to show) get their cards anyway. */
const norm = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function attachMentioned(reply, ctx) {
  const text = norm(reply);
  for (const row of ctx.seen.values()) {
    const name = norm(tr(row.name, ctx.locale));
    // Match on the distinctive part of the name (first words, without the brand prefix noise)
    const key = name.split(' ').slice(0, 5).join(' ');
    if (key.length > 8 && text.includes(key) && ctx.products.length < 4) ctx.products.push(toCard(row, ctx.locale));
  }
  if (!ctx.products.length) {
    // Fallback on a shorter key (brand + 2 words)
    for (const row of ctx.seen.values()) {
      const key = norm(tr(row.name, ctx.locale)).split(' ').slice(0, 3).join(' ');
      if (key.length > 8 && text.includes(key) && ctx.products.length < 4) ctx.products.push(toCard(row, ctx.locale));
    }
  }
}

/* --------------------------------- Endpoint -------------------------------- */

const chatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(30),
  locale: z.enum(['fr', 'en', 'ar']).default('fr'),
  path: z.string().max(200).optional(),
});

chatRouter.post(
  '/',
  rateLimit({ windowMs: 10 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false }),
  validate(chatSchema),
  async (req, res) => {
    if (!process.env.GROQ_API_KEY) throw new HttpError(503, 'Assistant not configured');
    const { messages, locale, path } = req.valid;
    const ctx = { locale, actions: [], products: [], seen: new Map() };
    const convo = [
      { role: 'system', content: await systemPrompt() },
      { role: 'system', content: `Interface language: ${LANG_NAMES[locale]}. Customer is on page: ${path || '/'}.` },
      ...messages.slice(-12),
    ];

    for (let step = 0; step < MAX_STEPS; step++) {
      const msg = await callGroq(convo);
      if (!msg.tool_calls?.length) {
        const { calls, text } = extractLeakedCalls(msg.content);
        for (const call of calls) await runTool(call.name, call.args, ctx).catch(() => null);
        if (!ctx.products.length) attachMentioned(text, ctx);
        return res.json({ reply: text, actions: ctx.actions, products: ctx.products });
      }
      convo.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
      for (const call of msg.tool_calls) {
        let args = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch {
          /* invalid JSON from the model: run with no args */
        }
        let result;
        try {
          result = await runTool(call.function.name, args, ctx);
        } catch (err) {
          result = { error: err.message };
        }
        convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }
    res.json({ reply: '', actions: ctx.actions, products: ctx.products });
  },
);

// Lets the widget fall back to WhatsApp when no key is configured
chatRouter.get('/status', (_req, res) => res.json({ enabled: Boolean(process.env.GROQ_API_KEY) }));
