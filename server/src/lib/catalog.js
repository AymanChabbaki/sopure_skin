import { query } from '../db/pool.js';
import { tr } from './utils.js';

const SORTS = {
  newest: 'p.created_at DESC, p.id DESC',
  popular: 'p.sales_count DESC, p.is_featured DESC, p.id DESC',
  price_asc: 'p.price ASC, p.id',
  price_desc: 'p.price DESC, p.id',
  name: "p.name->>'fr' ASC",
  rating: 'p.rating_avg DESC, p.rating_count DESC',
};

const PRODUCT_COLUMNS = `
  p.id, p.slug, p.sku, p.name, p.short_description, p.price, p.compare_at_price, p.stock,
  p.is_active, p.is_featured, p.is_new, p.sales_count, p.created_at, p.rating_avg, p.rating_count,
  b.id AS brand_id, b.name AS brand_name, b.slug AS brand_slug,
  (SELECT json_agg(json_build_object('url', i.url, 'thumbUrl', i.thumb_url, 'alt', i.alt) ORDER BY i.position)
     FROM (SELECT * FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 2) i) AS images
`;

/** Shapes a DB row for the storefront in the requested locale. */
export function toCard(row, locale) {
  return {
    id: row.id,
    slug: row.slug,
    name: tr(row.name, locale),
    shortDescription: tr(row.short_description, locale),
    price: row.price,
    compareAtPrice: row.compare_at_price,
    inStock: row.stock > 0,
    isNew: row.is_new,
    isFeatured: row.is_featured,
    rating: row.rating_avg,
    ratingCount: row.rating_count,
    brand: row.brand_id ? { id: row.brand_id, name: row.brand_name, slug: row.brand_slug } : null,
    images: row.images || [],
  };
}

/**
 * Catalog listing with filters. Used by both the storefront (active only) and the admin.
 */
export async function listProducts({
  q,
  category,
  brand,
  minPrice,
  maxPrice,
  onSale,
  featured,
  sort = 'popular',
  page = 1,
  limit = 24,
  includeInactive = false,
  status,
  ids,
}) {
  const where = [];
  const params = [];
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (!includeInactive || status === 'active') where.push('p.is_active');
  if (status === 'inactive') where.push('NOT p.is_active');
  if (status === 'low_stock') where.push('p.stock <= 5');
  if (q) {
    const term = add(`%${q}%`);
    where.push(`(p.name->>'fr' ILIKE ${term} OR p.name->>'en' ILIKE ${term} OR p.name->>'ar' ILIKE ${term} OR b.name ILIKE ${term} OR p.sku ILIKE ${term})`);
  }
  if (category) {
    where.push(`EXISTS (SELECT 1 FROM product_categories pc JOIN categories c ON c.id = pc.category_id
                        WHERE pc.product_id = p.id AND c.slug = ANY(${add(String(category).split(','))}))`);
  }
  if (brand) where.push(`b.slug = ANY(${add(String(brand).split(','))})`);
  if (minPrice) where.push(`p.price >= ${add(Number(minPrice))}`);
  if (maxPrice) where.push(`p.price <= ${add(Number(maxPrice))}`);
  if (onSale) where.push('p.compare_at_price IS NOT NULL AND p.compare_at_price > p.price');
  if (featured) where.push('p.is_featured');
  if (ids?.length) where.push(`p.id = ANY(${add(ids.map(Number))})`);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(Number(limit) || 24, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const orderBy = SORTS[sort] || SORTS.popular;

  const [list, count] = await Promise.all([
    query(
      `SELECT ${PRODUCT_COLUMNS}
         FROM products p LEFT JOIN brands b ON b.id = p.brand_id
         ${whereSql}
         ORDER BY (p.stock > 0) DESC, ${orderBy}
         LIMIT ${safeLimit} OFFSET ${(safePage - 1) * safeLimit}`,
      params,
    ),
    query(`SELECT count(*) FROM products p LEFT JOIN brands b ON b.id = p.brand_id ${whereSql}`, params),
  ]);

  const total = count.rows[0].count;
  return { rows: list.rows, total, page: safePage, pages: Math.max(Math.ceil(total / safeLimit), 1), limit: safeLimit };
}

export async function getProductBySlug(slug) {
  const { rows } = await query(
    `SELECT p.*, b.name AS brand_name, b.slug AS brand_slug,
       COALESCE((SELECT json_agg(json_build_object('id', i.id, 'url', i.url, 'thumbUrl', i.thumb_url, 'alt', i.alt, 'key', i.storage_key) ORDER BY i.position)
                  FROM product_images i WHERE i.product_id = p.id), '[]') AS images,
       COALESCE((SELECT json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'kind', c.kind) ORDER BY c.position)
                  FROM product_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.product_id = p.id), '[]') AS categories
     FROM products p LEFT JOIN brands b ON b.id = p.brand_id
     WHERE p.slug = $1 OR p.id::text = $1
     LIMIT 1`,
    [slug],
  );
  return rows[0] || null;
}

export function toDetail(row, locale) {
  return {
    ...toCard(row, locale),
    sku: row.sku,
    description: tr(row.description, locale),
    howToUse: tr(row.how_to_use, locale),
    ingredients: tr(row.ingredients, locale),
    stock: row.stock,
    metaTitle: tr(row.meta_title, locale),
    metaDescription: tr(row.meta_description, locale),
    categories: row.categories.map((c) => ({ id: c.id, slug: c.slug, kind: c.kind, name: tr(c.name, locale) })),
    images: row.images,
    updatedAt: row.updated_at,
  };
}

export async function relatedProducts(product, limit = 8) {
  const { rows } = await query(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p LEFT JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active AND p.id <> $1 AND (
            p.brand_id = $2 OR EXISTS (
              SELECT 1 FROM product_categories pc
               WHERE pc.product_id = p.id AND pc.category_id IN (
                 SELECT category_id FROM product_categories WHERE product_id = $1)))
      ORDER BY (p.stock > 0) DESC, p.sales_count DESC, random()
      LIMIT $3`,
    [product.id, product.brand_id, limit],
  );
  return rows;
}
