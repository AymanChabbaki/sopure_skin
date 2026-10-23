import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { DEFAULT_SETTINGS, getSettings, saveSetting } from '../../lib/settings.js';
import { removeImage, storeImage } from '../../lib/images.js';
import { storageDriver } from '../../lib/storage.js';
import { localizedUrls, submitUrls } from '../../lib/indexnow.js';
import { mailEnabled, sendMail } from '../../lib/mailer.js';
import { HttpError } from '../../lib/utils.js';
import { validate } from '../../middleware/errors.js';
import { requireOwner } from '../../middleware/auth.js';

/* --------------------------------- Settings -------------------------------- */

export const settingsRouter = Router();

settingsRouter.get('/', async (_req, res) => {
  res.json({ ...(await getSettings()), storageDriver });
});

const shippingSchema = z.object({
  casablancaFee: z.number().min(0),
  otherFee: z.number().min(0),
  freeAboveItems: z.number().int().min(0),
  casablancaAliases: z.array(z.string().min(1)).min(1),
});

const returnsSchema = z.object({ enabled: z.boolean(), days: z.number().int().min(1).max(365), fees: z.enum(['free', 'customer']) });

// Navbar: a map of the known nav ids to booleans (visibility) + their display order.
const NAV_IDS = ['home', 'shop', 'brands', 'hair', 'body', 'best', 'new', 'offers', 'routine'];
const navbarSchema = z.object({
  ...Object.fromEntries(NAV_IDS.map((id) => [id, z.boolean()])),
  order: z.array(z.enum(NAV_IDS)),
}).partial();

/** Sends every public URL (from the sitemap) to IndexNow: Bing, Yandex, Seznam, Naver. */
settingsRouter.post('/indexnow', async (_req, res) => {
  const [{ rows: products }, { rows: categories }, { rows: brands }] = await Promise.all([
    query('SELECT slug FROM products WHERE is_active'),
    query('SELECT slug FROM categories WHERE is_visible'),
    query('SELECT slug FROM brands'),
  ]);
  const paths = ['/', '/shop', '/brands', '/routine', '/faq', '/shipping', '/policies', '/about', '/contact',
    ...categories.map((c) => `/category/${c.slug}`), ...brands.map((b) => `/brand/${b.slug}`), ...products.map((p) => `/product/${p.slug}`)];
  res.json(await submitUrls(paths.flatMap(localizedUrls)));
});

/** Order email alerts: status and a test message. */
settingsRouter.get('/email', (_req, res) => {
  res.json({ enabled: mailEnabled(), to: process.env.ORDER_NOTIFY_EMAIL || null, from: process.env.SMTP_FROM || process.env.SMTP_USER || null });
});

settingsRouter.post('/email/test', async (_req, res) => {
  if (!mailEnabled()) throw new HttpError(400, 'SMTP non configuré (variables SMTP_HOST, SMTP_USER, SMTP_PASS)');
  try {
    await sendMail({
      subject: 'Test · alertes commandes So Pure Skin',
      text: 'Les emails de nouvelles commandes fonctionnent.',
      html: '<p style="font-family:Arial,sans-serif">Les emails de <strong>nouvelles commandes</strong> fonctionnent.</p>',
    });
  } catch (err) {
    throw new HttpError(502, `Envoi impossible : ${err.message}`);
  }
  res.json({ ok: true });
});

settingsRouter.put('/:key', async (req, res) => {
  const { key } = req.params;
  if (!(key in DEFAULT_SETTINGS)) throw new HttpError(400, `Unknown setting "${key}"`);
  const value =
    key === 'shipping' ? shippingSchema.parse(req.body)
    : key === 'returns' ? returnsSchema.parse(req.body)
    : key === 'navbar' ? navbarSchema.parse(req.body)
    : req.body;
  // Testimonial screenshots removed from the list are deleted from storage too (no orphan files)
  const previous = key === 'testimonials' ? (await getSettings()).testimonials || [] : [];
  await saveSetting(key, value);
  if (key === 'testimonials') {
    const kept = new Set((value || []).map((t) => t.key).filter(Boolean));
    await Promise.all(previous.filter((t) => t.key && !kept.has(t.key)).map((t) => removeImage(t.key)));
  }
  res.json({ ok: true });
});

/* --------------------------------- Uploads --------------------------------- */

export const uploadsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|avif|gif)$/.test(file.mimetype)),
});

uploadsRouter.post('/', upload.array('files', 12), async (req, res) => {
  if (!req.files?.length) throw new HttpError(400, 'No valid image received');
  const folder = ['products', 'categories', 'brands', 'banners', 'testimonials'].includes(req.query.folder) ? req.query.folder : 'products';
  // Optional ?name= (product / brand name) gives the files descriptive names for image SEO
  const name = String(req.query.name || '').slice(0, 120);
  const stored = await Promise.all(req.files.map((f) => storeImage(f.buffer, folder, name)));
  res.status(201).json(stored);
});

/* ------------------------------- Team (admins) ------------------------------ */

export const teamRouter = Router();

teamRouter.get('/', async (_req, res) => {
  const { rows } = await query('SELECT id, name, email, role, created_at AS "createdAt" FROM admins ORDER BY id');
  res.json(rows);
});

teamRouter.post(
  '/',
  requireOwner,
  validate(
    z.object({
      name: z.string().min(2),
      email: z.email(),
      password: z.string().min(8),
      role: z.enum(['owner', 'admin']).default('admin'),
    }),
  ),
  async (req, res) => {
    const { name, email, password, role } = req.valid;
    const { rows: [row] } = await query(
      'INSERT INTO admins (name, email, password_hash, role) VALUES ($1, lower($2), $3, $4) RETURNING id',
      [name, email, await bcrypt.hash(password, 12), role],
    );
    res.status(201).json(row);
  },
);

teamRouter.put(
  '/me/password',
  validate(z.object({ currentPassword: z.string(), newPassword: z.string().min(8) })),
  async (req, res) => {
    const { rows: [admin] } = await query('SELECT password_hash FROM admins WHERE id = $1', [req.admin.sub]);
    if (!admin || !(await bcrypt.compare(req.valid.currentPassword, admin.password_hash))) {
      throw new HttpError(400, 'Current password is incorrect');
    }
    await query('UPDATE admins SET password_hash = $1 WHERE id = $2', [
      await bcrypt.hash(req.valid.newPassword, 12),
      req.admin.sub,
    ]);
    res.json({ ok: true });
  },
);

teamRouter.delete('/:id', requireOwner, async (req, res) => {
  if (Number(req.params.id) === req.admin.sub) throw new HttpError(400, 'You cannot delete your own account');
  await query('DELETE FROM admins WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

/* -------------------------------- Newsletter ------------------------------- */

export const subscribersRouter = Router();

subscribersRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    'SELECT id, email, locale, created_at AS "createdAt" FROM newsletter_subscribers ORDER BY created_at DESC',
  );
  res.json(rows);
});

subscribersRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM newsletter_subscribers WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});
