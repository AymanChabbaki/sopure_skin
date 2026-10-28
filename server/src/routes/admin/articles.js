import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { HttpError, slugify } from '../../lib/utils.js';
import { validate } from '../../middleware/errors.js';

export const articlesRouter = Router();

const i18n = z.object({ fr: z.string().default(''), en: z.string().default(''), ar: z.string().default('') }).partial();

const articleSchema = z.object({
  slug: z.string().trim().max(100).optional(),
  title: i18n.refine((v) => v.fr?.trim(), 'French title is required'),
  excerpt: i18n.default({}),
  body: i18n.default({}),
  coverUrl: z.string().nullish(),
  productIds: z.array(z.number().int().positive()).max(24).default([]),
  isPublished: z.boolean().default(false),
});

const COLUMNS = `a.id, a.slug, a.title, a.excerpt, a.body, a.cover_url AS "coverUrl", a.product_ids AS "productIds",
  a.is_published AS "isPublished", a.published_at AS "publishedAt", a.updated_at AS "updatedAt"`;

articlesRouter.get('/', async (_req, res) => {
  const { rows } = await query(`SELECT ${COLUMNS} FROM articles a ORDER BY a.is_published, a.published_at DESC NULLS FIRST, a.id DESC`);
  res.json(rows);
});

articlesRouter.get('/:id', async (req, res) => {
  const { rows: [row] } = await query(`SELECT ${COLUMNS} FROM articles a WHERE a.id = $1`, [req.params.id]);
  if (!row) throw new HttpError(404, 'Article not found');
  // Names of the linked products for the picker
  const { rows: products } = await query(`SELECT id, name->>'fr' AS name FROM products WHERE id = ANY($1)`, [row.productIds]);
  res.json({ ...row, products });
});

const articleValues = (d) => [slugify(d.slug || d.title.fr), d.title, d.excerpt, d.body, d.coverUrl || null, d.productIds, d.isPublished];

articlesRouter.post('/', validate(articleSchema), async (req, res) => {
  const { rows: [row] } = await query(
    `INSERT INTO articles (slug, title, excerpt, body, cover_url, product_ids, is_published, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, CASE WHEN $7 THEN now() END) RETURNING id`,
    articleValues(req.valid),
  );
  res.status(201).json(row);
});

articlesRouter.put('/:id', validate(articleSchema), async (req, res) => {
  // published_at is set the first time the guide goes live and kept afterwards
  const { rowCount } = await query(
    `UPDATE articles SET slug=$1, title=$2, excerpt=$3, body=$4, cover_url=$5, product_ids=$6, is_published=$7,
            published_at = CASE WHEN $7 THEN coalesce(published_at, now()) ELSE published_at END, updated_at=now()
      WHERE id=$8`,
    [...articleValues(req.valid), req.params.id],
  );
  if (!rowCount) throw new HttpError(404, 'Article not found');
  res.json({ ok: true });
});

articlesRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM articles WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});
