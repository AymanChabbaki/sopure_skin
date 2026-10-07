import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { DEFAULT_SETTINGS, getSettings, saveSetting } from '../../lib/settings.js';
import { storeImage } from '../../lib/images.js';
import { storageDriver } from '../../lib/storage.js';
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

settingsRouter.put('/:key', async (req, res) => {
  const { key } = req.params;
  if (!(key in DEFAULT_SETTINGS)) throw new HttpError(400, `Unknown setting "${key}"`);
  const value = key === 'shipping' ? shippingSchema.parse(req.body) : req.body;
  await saveSetting(key, value);
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
  const stored = await Promise.all(req.files.map((f) => storeImage(f.buffer, folder)));
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
