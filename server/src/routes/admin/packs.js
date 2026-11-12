import express, { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { query, withTransaction } from '../../db/pool.js';
import { putObject, deleteObject } from '../../lib/storage.js';
import { removeImage } from '../../lib/images.js';
import { HttpError, slugify } from '../../lib/utils.js';
import { validate } from '../../middleware/errors.js';

const i18n = z.object({ fr: z.string().default(''), en: z.string().default(''), ar: z.string().default('') }).partial();
const orderSchema = z.object({ ids: z.array(z.number().int().positive()).max(500) });

/* ---------------------------------- Packs ---------------------------------- */

export const packsRouter = Router();

const packSchema = z.object({
  name: i18n.refine((v) => v.fr?.trim(), 'French name is required'),
  description: i18n.default({}),
  isActive: z.boolean().default(true),
  productIds: z.array(z.number().int().positive()).min(1, 'Choose at least one product').max(20),
  categoryIds: z.array(z.number().int().positive()).default([]),
});

packsRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.name, p.description, p.is_active AS "isActive", p.position,
            COALESCE((SELECT json_agg(pi.product_id ORDER BY pi.position) FROM pack_items pi WHERE pi.pack_id = p.id), '[]') AS "productIds",
            COALESCE((SELECT json_agg(pc.category_id) FROM pack_categories pc WHERE pc.pack_id = p.id), '[]') AS "categoryIds",
            COALESCE((SELECT sum(pr.price) FROM pack_items pi JOIN products pr ON pr.id = pi.product_id WHERE pi.pack_id = p.id), 0) AS total
       FROM packs p ORDER BY p.position, p.id`,
  );
  res.json(rows);
});

async function savePackRelations(db, id, d) {
  await db.query('DELETE FROM pack_items WHERE pack_id = $1', [id]);
  await db.query(
    'INSERT INTO pack_items (pack_id, product_id, position) SELECT $1, x.id, x.ord FROM unnest($2::int[]) WITH ORDINALITY AS x(id, ord)',
    [id, [...new Set(d.productIds)]],
  );
  await db.query('DELETE FROM pack_categories WHERE pack_id = $1', [id]);
  if (d.categoryIds.length) {
    await db.query('INSERT INTO pack_categories (pack_id, category_id) SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING', [id, d.categoryIds]);
  }
}

packsRouter.post('/', validate(packSchema), async (req, res) => {
  const d = req.valid;
  const id = await withTransaction(async (db) => {
    const { rows: [row] } = await db.query(
      `INSERT INTO packs (name, description, is_active, position)
       VALUES ($1, $2, $3, (SELECT COALESCE(max(position), 0) + 1 FROM packs)) RETURNING id`,
      [d.name, d.description, d.isActive],
    );
    await savePackRelations(db, row.id, d);
    return row.id;
  });
  res.status(201).json({ id });
});

packsRouter.put('/order', validate(orderSchema), async (req, res) => {
  await query('UPDATE packs p SET position = x.ord FROM unnest($1::int[]) WITH ORDINALITY AS x(id, ord) WHERE p.id = x.id', [req.valid.ids]);
  res.json({ ok: true });
});

packsRouter.put('/:id', validate(packSchema), async (req, res) => {
  const d = req.valid;
  const id = Number(req.params.id);
  await withTransaction(async (db) => {
    const { rowCount } = await db.query('UPDATE packs SET name = $1, description = $2, is_active = $3, updated_at = now() WHERE id = $4', [
      d.name, d.description, d.isActive, id,
    ]);
    if (!rowCount) throw new HttpError(404, 'Pack not found');
    await savePackRelations(db, id, d);
  });
  res.json({ id });
});

packsRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM packs WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

/* ---------------------------------- Videos --------------------------------- */

export const videosRouter = Router();

const VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
export const MAX_VIDEO_MB = 50;

const videoSchema = z.object({
  title: i18n.default({}),
  url: z.string().min(1),
  key: z.string().nullish(),
  posterUrl: z.string().nullish(),
  posterKey: z.string().nullish(),
  productId: z.number().int().positive().nullish(),
  isActive: z.boolean().default(true),
});

const VIDEO_COLUMNS = `v.id, v.title, v.url, v.storage_key AS key, v.poster_url AS "posterUrl", v.poster_key AS "posterKey",
  v.product_id AS "productId", p.name->>'fr' AS "productName", v.is_active AS "isActive", v.position`;

videosRouter.get('/', async (_req, res) => {
  const { rows } = await query(`SELECT ${VIDEO_COLUMNS} FROM videos v LEFT JOIN products p ON p.id = v.product_id ORDER BY v.position, v.id`);
  res.json(rows);
});

/** Raw video upload (body = the file). Stored as-is in R2 (or local disk in development). */
videosRouter.post(
  '/upload',
  express.raw({ type: Object.keys(VIDEO_TYPES), limit: `${MAX_VIDEO_MB}mb` }),
  async (req, res) => {
    const ext = VIDEO_TYPES[req.get('content-type')?.split(';')[0]];
    if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) throw new HttpError(400, 'Format vidéo non pris en charge (MP4, WebM ou MOV)');
    const name = slugify(String(req.query.name || '')).slice(0, 60) || 'video';
    const key = `videos/${new Date().getFullYear()}/${name}-${randomUUID().slice(0, 6)}.${ext}`;
    const url = await putObject(key, req.body, req.get('content-type'));
    res.status(201).json({ url, key });
  },
);

videosRouter.post('/', validate(videoSchema), async (req, res) => {
  const d = req.valid;
  const { rows: [row] } = await query(
    `INSERT INTO videos (title, url, storage_key, poster_url, poster_key, product_id, is_active, position)
     VALUES ($1,$2,$3,$4,$5,$6,$7,(SELECT COALESCE(min(position), 0) - 1 FROM videos)) RETURNING id`,
    [d.title, d.url, d.key || null, d.posterUrl || null, d.posterKey || null, d.productId || null, d.isActive],
  );
  res.status(201).json({ id: row.id });
});

videosRouter.put('/order', validate(orderSchema), async (req, res) => {
  await query('UPDATE videos v SET position = x.ord FROM unnest($1::int[]) WITH ORDINALITY AS x(id, ord) WHERE v.id = x.id', [req.valid.ids]);
  res.json({ ok: true });
});

videosRouter.put('/:id', validate(videoSchema.partial()), async (req, res) => {
  const d = req.valid;
  const { rowCount } = await query(
    `UPDATE videos SET title = COALESCE($1, title), product_id = CASE WHEN $2::boolean THEN $3::int ELSE product_id END,
            is_active = COALESCE($4, is_active) WHERE id = $5`,
    [d.title ?? null, 'productId' in d, d.productId ?? null, d.isActive ?? null, req.params.id],
  );
  if (!rowCount) throw new HttpError(404, 'Video not found');
  res.json({ ok: true });
});

videosRouter.delete('/:id', async (req, res) => {
  const { rows: [row] } = await query('DELETE FROM videos WHERE id = $1 RETURNING storage_key, poster_key', [req.params.id]);
  if (row) await Promise.all([deleteObject(row.storage_key), removeImage(row.poster_key)]);
  res.json({ ok: true });
});
