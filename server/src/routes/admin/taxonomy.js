import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { HttpError, slugify } from '../../lib/utils.js';
import { validate } from '../../middleware/errors.js';

const i18n = z.object({ fr: z.string().default(''), en: z.string().default(''), ar: z.string().default('') }).partial();

/* -------------------------------- Categories ------------------------------- */

export const categoriesRouter = Router();

const categorySchema = z.object({
  slug: z.string().trim().max(80).optional(),
  kind: z.enum(['type', 'routine']).default('type'),
  name: i18n.refine((v) => v.fr?.trim(), 'French name is required'),
  description: i18n.default({}),
  imageUrl: z.string().nullish(),
  position: z.number().int().default(0),
  isVisible: z.boolean().default(true),
});

categoriesRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT c.id, c.slug, c.kind, c.name, c.description, c.image_url AS "imageUrl", c.position, c.is_visible AS "isVisible",
            (SELECT count(*) FROM product_categories WHERE category_id = c.id) AS "productCount"
       FROM categories c ORDER BY c.kind, c.position, c.id`,
  );
  res.json(rows);
});

const categoryValues = (d) => [slugify(d.slug || d.name.fr), d.kind, d.name, d.description, d.imageUrl || null, d.position, d.isVisible];

categoriesRouter.post('/', validate(categorySchema), async (req, res) => {
  const { rows: [row] } = await query(
    `INSERT INTO categories (slug, kind, name, description, image_url, position, is_visible)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    categoryValues(req.valid),
  );
  res.status(201).json(row);
});

categoriesRouter.put('/:id', validate(categorySchema), async (req, res) => {
  const { rowCount } = await query(
    `UPDATE categories SET slug=$1, kind=$2, name=$3, description=$4, image_url=$5, position=$6, is_visible=$7 WHERE id=$8`,
    [...categoryValues(req.valid), req.params.id],
  );
  if (!rowCount) throw new HttpError(404, 'Category not found');
  res.json({ ok: true });
});

categoriesRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

/* ---------------------------------- Brands --------------------------------- */

export const brandsRouter = Router();

const brandSchema = z.object({
  slug: z.string().trim().max(80).optional(),
  name: z.string().trim().min(1).max(80),
  description: i18n.default({}),
  logoUrl: z.string().nullish(),
  isFeatured: z.boolean().default(false),
  position: z.number().int().default(0),
});

brandsRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT b.id, b.slug, b.name, b.description, b.logo_url AS "logoUrl", b.is_featured AS "isFeatured", b.position,
            (SELECT count(*) FROM products WHERE brand_id = b.id) AS "productCount"
       FROM brands b ORDER BY b.position, b.name`,
  );
  res.json(rows);
});

const brandValues = (d) => [slugify(d.slug || d.name), d.name, d.description, d.logoUrl || null, d.isFeatured, d.position];

brandsRouter.post('/', validate(brandSchema), async (req, res) => {
  const { rows: [row] } = await query(
    `INSERT INTO brands (slug, name, description, logo_url, is_featured, position) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    brandValues(req.valid),
  );
  res.status(201).json(row);
});

brandsRouter.put('/:id', validate(brandSchema), async (req, res) => {
  const { rowCount } = await query(
    `UPDATE brands SET slug=$1, name=$2, description=$3, logo_url=$4, is_featured=$5, position=$6 WHERE id=$7`,
    [...brandValues(req.valid), req.params.id],
  );
  if (!rowCount) throw new HttpError(404, 'Brand not found');
  res.json({ ok: true });
});

brandsRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM brands WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});
