import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { listProducts, getProductBySlug, toCard, toDetail, relatedProducts } from '../lib/catalog.js';
import { getSettings, computeShipping, isCasablanca } from '../lib/settings.js';
import { pickLocale, tr, HttpError } from '../lib/utils.js';
import { validate } from '../middleware/errors.js';

export const publicRouter = Router();

// Every storefront request carries ?lang=fr|en|ar
publicRouter.use((req, res, next) => {
  req.locale = pickLocale(req.query.lang);
  // Browsers must not serve stale data (Chrome honours stale-while-revalidate in its own cache):
  // "no-cache" = always revalidate via ETag, a cheap 304 when nothing changed.
  // The CDN gets its own directive (ignored by browsers) and keeps a copy 15 s to absorb traffic spikes.
  res.set('Cache-Control', 'no-cache');
  res.set('CDN-Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
  next();
});

publicRouter.get('/settings', async (req, res) => {
  const s = await getSettings();
  const l = req.locale;
  res.json({
    shipping: s.shipping,
    announcements: s.announcements.map((a) => tr(a, l)).filter(Boolean),
    hero: s.hero.map((h) => ({
      eyebrow: tr(h.eyebrow, l),
      title: tr(h.title, l),
      subtitle: tr(h.subtitle, l),
      cta: tr(h.cta, l),
      link: h.link,
      image: h.image,
      imageSm: h.imageSm || h.image,
      side: h.side === 'right' ? 'right' : 'left',
      focus: h.focus || 'center',
    })),
    contact: s.contact,
    testimonials: s.testimonials,
    seo: { title: tr(s.seo.title, l), description: tr(s.seo.description, l) },
  });
});

publicRouter.get('/categories', async (req, res) => {
  const { rows } = await query(
    `SELECT c.id, c.slug, c.kind, c.name, c.description, c.image_url,
            (SELECT count(*) FROM product_categories pc JOIN products p ON p.id = pc.product_id
              WHERE pc.category_id = c.id AND p.is_active) AS product_count,
            (SELECT i.thumb_url FROM product_categories pc JOIN product_images i ON i.product_id = pc.product_id
              WHERE pc.category_id = c.id ORDER BY i.position LIMIT 1) AS fallback_image
       FROM categories c WHERE c.is_visible ORDER BY c.kind, c.position, c.id`,
  );
  res.json(
    rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      kind: c.kind,
      name: tr(c.name, req.locale),
      description: tr(c.description, req.locale),
      image: c.image_url || c.fallback_image,
      productCount: c.product_count,
    })),
  );
});

publicRouter.get('/brands', async (req, res) => {
  const { rows } = await query(
    `SELECT b.id, b.slug, b.name, b.description, b.logo_url, b.is_featured,
            (SELECT count(*) FROM products p WHERE p.brand_id = b.id AND p.is_active) AS product_count
       FROM brands b ORDER BY b.position, b.name`,
  );
  res.json(
    rows
      .filter((b) => b.product_count > 0)
      .map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        description: tr(b.description, req.locale),
        logo: b.logo_url,
        isFeatured: b.is_featured,
        productCount: b.product_count,
      })),
  );
});

publicRouter.get('/products', async (req, res) => {
  const { q, category, brand, minPrice, maxPrice, onSale, featured, sort, page, limit, ids } = req.query;
  const result = await listProducts({
    q,
    category,
    brand,
    minPrice,
    maxPrice,
    onSale: onSale === 'true',
    featured: featured === 'true',
    sort,
    page,
    limit,
    ids: ids ? String(ids).split(',').filter(Boolean) : undefined,
  });
  res.json({ ...result, rows: result.rows.map((r) => toCard(r, req.locale)) });
});

publicRouter.get('/products/:slug', async (req, res) => {
  const row = await getProductBySlug(req.params.slug);
  if (!row || !row.is_active) throw new HttpError(404, 'Product not found');
  const related = await relatedProducts(row);
  res.json({ product: toDetail(row, req.locale), related: related.map((r) => toCard(r, req.locale)) });
});

/* --------------------------------- Reviews --------------------------------- */

publicRouter.get('/products/:slug/reviews', async (req, res) => {
  const product = await getProductBySlug(req.params.slug);
  if (!product?.is_active) throw new HttpError(404, 'Product not found');
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = 6;
  const [list, dist] = await Promise.all([
    query(
      `SELECT id, author_name AS "author", city, rating, body, created_at AS "createdAt"
         FROM reviews WHERE product_id = $1 AND is_approved
        ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [product.id, limit, (page - 1) * limit],
    ),
    query(`SELECT rating, count(*) FROM reviews WHERE product_id = $1 AND is_approved GROUP BY rating`, [product.id]),
  ]);
  const distribution = Object.fromEntries([5, 4, 3, 2, 1].map((r) => [r, dist.rows.find((d) => d.rating === r)?.count || 0]));
  res.json({
    average: product.rating_avg,
    count: product.rating_count,
    distribution,
    page,
    pages: Math.max(Math.ceil(product.rating_count / limit), 1),
    rows: list.rows,
  });
});

publicRouter.post(
  '/products/:slug/reviews',
  rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false }),
  validate(
    z.object({
      author: z.string().trim().min(2).max(60),
      city: z.string().trim().max(60).optional(),
      rating: z.number().int().min(1).max(5),
      body: z.string().trim().min(5).max(1000),
      locale: z.enum(['fr', 'en', 'ar']).default('fr'),
    }),
  ),
  async (req, res) => {
    const product = await getProductBySlug(req.params.slug);
    if (!product?.is_active) throw new HttpError(404, 'Product not found');
    const { author, city, rating, body, locale } = req.valid;
    // Published only after approval in the admin
    await query('INSERT INTO reviews (product_id, author_name, city, rating, body, locale) VALUES ($1,$2,$3,$4,$5,$6)', [
      product.id, author, city || null, rating, body, locale,
    ]);
    res.status(201).json({ ok: true, pending: true });
  },
);

/* ---------------------------------- Orders --------------------------------- */

const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(\+212|0)[\s.-]?[5-7](?:[\s.-]?\d){8}$/, 'Invalid Moroccan phone number'),
  email: z.union([z.literal(''), z.email()]).optional(),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(300),
  notes: z.string().trim().max(500).optional(),
  locale: z.enum(['fr', 'en', 'ar']).default('fr'),
  items: z
    .array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(50) }))
    .min(1)
    .max(60),
});

publicRouter.post('/orders', orderLimiter, validate(orderSchema), async (req, res) => {
  const data = req.valid;
  const settings = await getSettings();

  const order = await withTransaction(async (db) => {
    const ids = data.items.map((i) => i.productId);
    // Lock rows so concurrent orders cannot oversell
    const { rows: products } = await db.query(
      `SELECT p.id, p.name, p.price, p.stock, p.is_active,
              (SELECT thumb_url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1) AS image
         FROM products p WHERE p.id = ANY($1) FOR UPDATE`,
      [ids],
    );
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = data.items.map((item) => {
      const p = byId.get(item.productId);
      if (!p || !p.is_active) throw new HttpError(400, 'A product in your cart is no longer available', { productId: item.productId });
      if (p.stock < item.quantity) throw new HttpError(409, 'Insufficient stock', { productId: item.productId, available: p.stock });
      return { ...item, name: tr(p.name, 'fr'), unitPrice: p.price, image: p.image, lineTotal: p.price * item.quantity };
    });

    const itemsCount = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const shippingFee = computeShipping({ city: data.city, itemsCount }, settings.shipping);
    // "casa", "الدار البيضاء"… are stored as one city so stats group correctly
    if (isCasablanca(data.city, settings.shipping)) data.city = 'Casablanca';
    const total = subtotal + shippingFee;

    // Order number is derived from the serial id, so it is unique without a race
    const { rows: [{ id }] } = await db.query(`SELECT nextval(pg_get_serial_sequence('orders', 'id'))::int AS id`);
    const number = `SPS-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(id).padStart(4, '0')}`;
    const { rows: [created] } = await db.query(
      `INSERT INTO orders (id, number, customer_name, phone, email, city, address, notes, locale,
                           items_count, subtotal, shipping_fee, total, payment_method)
       VALUES ($13,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'cod')
       RETURNING id, number, subtotal, shipping_fee, total, items_count, created_at`,
      [number, data.customerName, data.phone, data.email || null, data.city, data.address, data.notes || null,
        data.locale, itemsCount, subtotal, shippingFee, total, id],
    );

    for (const l of lines) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, name, image_url, unit_price, quantity, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [created.id, l.productId, l.name, l.image, l.unitPrice, l.quantity, l.lineTotal],
      );
      await db.query('UPDATE products SET stock = stock - $1, sales_count = sales_count + $1 WHERE id = $2', [l.quantity, l.productId]);
    }
    return created;
  });

  res.status(201).json({
    number: order.number,
    itemsCount: order.items_count,
    subtotal: order.subtotal,
    shippingFee: order.shipping_fee,
    total: order.total,
    createdAt: order.created_at,
  });
});

publicRouter.post(
  '/newsletter',
  rateLimit({ windowMs: 60 * 60 * 1000, limit: 10 }),
  validate(z.object({ email: z.email(), locale: z.enum(['fr', 'en', 'ar']).default('fr') })),
  async (req, res) => {
    await query('INSERT INTO newsletter_subscribers (email, locale) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING', [
      req.valid.email.toLowerCase(),
      req.valid.locale,
    ]);
    res.status(201).json({ ok: true });
  },
);
