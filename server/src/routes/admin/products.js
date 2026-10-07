import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../../db/pool.js';
import { listProducts, getProductBySlug } from '../../lib/catalog.js';
import { removeImage } from '../../lib/images.js';
import { HttpError, slugify } from '../../lib/utils.js';
import { validate } from '../../middleware/errors.js';

export const productsRouter = Router();

const i18n = z.object({ fr: z.string().default(''), en: z.string().default(''), ar: z.string().default('') }).partial();

const productSchema = z.object({
  slug: z.string().trim().max(100).optional(),
  sku: z.string().trim().max(60).nullish(),
  brandId: z.number().int().positive().nullish(),
  name: i18n.refine((v) => v.fr?.trim(), 'French name is required'),
  shortDescription: i18n.default({}),
  description: i18n.default({}),
  howToUse: i18n.default({}),
  ingredients: i18n.default({}),
  metaTitle: i18n.default({}),
  metaDescription: i18n.default({}),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).nullish(),
  stock: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  categoryIds: z.array(z.number().int().positive()).default([]),
  images: z
    .array(z.object({ url: z.string(), thumbUrl: z.string(), key: z.string().nullish(), alt: z.string().nullish() }))
    .default([]),
});

productsRouter.get('/', async (req, res) => {
  const { q, category, brand, sort = 'newest', page, limit = 20, status } = req.query;
  const result = await listProducts({ q, category, brand, sort, page, limit, status, includeInactive: true });
  res.json({
    ...result,
    rows: result.rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      sku: r.sku,
      name: r.name.fr,
      brand: r.brand_name,
      price: r.price,
      compareAtPrice: r.compare_at_price,
      stock: r.stock,
      isActive: r.is_active,
      isFeatured: r.is_featured,
      isNew: r.is_new,
      salesCount: r.sales_count,
      image: r.images?.[0]?.thumbUrl,
    })),
  });
});

productsRouter.get('/:id', async (req, res) => {
  const row = await getProductBySlug(req.params.id);
  if (!row) throw new HttpError(404, 'Product not found');
  res.json({
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    brandId: row.brand_id,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    howToUse: row.how_to_use,
    ingredients: row.ingredients,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    stock: row.stock,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    isNew: row.is_new,
    categoryIds: row.categories.map((c) => c.id),
    images: row.images,
  });
});

async function uniqueSlug(db, base, excludeId = 0) {
  const root = slugify(base) || 'produit';
  let slug = root;
  for (let i = 2; ; i += 1) {
    const { rowCount } = await db.query('SELECT 1 FROM products WHERE slug = $1 AND id <> $2', [slug, excludeId]);
    if (!rowCount) return slug;
    slug = `${root}-${i}`;
  }
}

async function saveRelations(db, productId, data) {
  await db.query('DELETE FROM product_categories WHERE product_id = $1', [productId]);
  if (data.categoryIds.length) {
    await db.query(
      'INSERT INTO product_categories (product_id, category_id) SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING',
      [productId, data.categoryIds],
    );
  }
  const { rows: previous } = await db.query('SELECT storage_key FROM product_images WHERE product_id = $1', [productId]);
  await db.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
  for (const [position, img] of data.images.entries()) {
    await db.query(
      'INSERT INTO product_images (product_id, url, thumb_url, storage_key, alt, position) VALUES ($1,$2,$3,$4,$5,$6)',
      [productId, img.url, img.thumbUrl, img.key || null, img.alt || null, position],
    );
  }
  const kept = new Set(data.images.map((i) => i.key).filter(Boolean));
  return previous.map((p) => p.storage_key).filter((k) => k && !kept.has(k));
}

const productValues = (d) => [
  d.sku || null, d.brandId || null, d.name, d.shortDescription, d.description, d.howToUse, d.ingredients,
  d.metaTitle, d.metaDescription, d.price, d.compareAtPrice || null, d.stock, d.isActive, d.isFeatured, d.isNew,
];

productsRouter.post('/', validate(productSchema), async (req, res) => {
  const d = req.valid;
  const id = await withTransaction(async (db) => {
    const slug = await uniqueSlug(db, d.slug || d.name.fr);
    const { rows: [row] } = await db.query(
      `INSERT INTO products (sku, brand_id, name, short_description, description, how_to_use, ingredients,
                             meta_title, meta_description, price, compare_at_price, stock, is_active, is_featured, is_new, slug)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [...productValues(d), slug],
    );
    await saveRelations(db, row.id, d);
    return row.id;
  });
  res.status(201).json({ id });
});

productsRouter.put('/:id', validate(productSchema), async (req, res) => {
  const d = req.valid;
  const id = Number(req.params.id);
  const orphaned = await withTransaction(async (db) => {
    const slug = await uniqueSlug(db, d.slug || d.name.fr, id);
    const { rowCount } = await db.query(
      `UPDATE products SET sku=$1, brand_id=$2, name=$3, short_description=$4, description=$5, how_to_use=$6,
              ingredients=$7, meta_title=$8, meta_description=$9, price=$10, compare_at_price=$11, stock=$12,
              is_active=$13, is_featured=$14, is_new=$15, slug=$16, updated_at=now()
        WHERE id=$17`,
      [...productValues(d), slug, id],
    );
    if (!rowCount) throw new HttpError(404, 'Product not found');
    return saveRelations(db, id, d);
  });
  await Promise.all(orphaned.map(removeImage));
  res.json({ id });
});

productsRouter.patch(
  '/bulk',
  validate(
    z.object({
      ids: z.array(z.number().int()).min(1),
      action: z.enum(['activate', 'deactivate', 'feature', 'unfeature', 'delete']),
    }),
  ),
  async (req, res) => {
    const { ids, action } = req.valid;
    const sql = {
      activate: 'UPDATE products SET is_active = true, updated_at = now() WHERE id = ANY($1)',
      deactivate: 'UPDATE products SET is_active = false, updated_at = now() WHERE id = ANY($1)',
      feature: 'UPDATE products SET is_featured = true, updated_at = now() WHERE id = ANY($1)',
      unfeature: 'UPDATE products SET is_featured = false, updated_at = now() WHERE id = ANY($1)',
    }[action];
    if (sql) {
      await query(sql, [ids]);
    } else {
      const { rows } = await query('SELECT storage_key FROM product_images WHERE product_id = ANY($1)', [ids]);
      await query('DELETE FROM products WHERE id = ANY($1)', [ids]);
      await Promise.all(rows.map((r) => removeImage(r.storage_key)));
    }
    res.json({ ok: true });
  },
);

productsRouter.patch('/:id/stock', validate(z.object({ stock: z.number().int().min(0) })), async (req, res) => {
  await query('UPDATE products SET stock = $1, updated_at = now() WHERE id = $2', [req.valid.stock, req.params.id]);
  res.json({ ok: true });
});

productsRouter.delete('/:id', async (req, res) => {
  const { rows } = await query('SELECT storage_key FROM product_images WHERE product_id = $1', [req.params.id]);
  const { rowCount } = await query('DELETE FROM products WHERE id = $1', [req.params.id]);
  if (!rowCount) throw new HttpError(404, 'Product not found');
  await Promise.all(rows.map((r) => removeImage(r.storage_key)));
  res.json({ ok: true });
});
