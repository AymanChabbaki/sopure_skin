/**
 * Imports the WooCommerce export (seed_products.json + downloaded_images/) into PostgreSQL,
 * uploading every image to R2 (or local disk) as optimized WebP.
 * Idempotent: products already imported (same legacy_id) are skipped.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool, query } from './pool.js';
import { migrate } from './migrate.js';
import { config } from '../config.js';
import { storeImage } from '../lib/images.js';
import { slugify, stripHtml } from '../lib/utils.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/* ------------------------------- Product types ------------------------------ */

const TYPES = [
  { slug: 'nettoyants', aliases: ['nettoyant'], name: { fr: 'Nettoyants', en: 'Cleansers', ar: 'منظفات' } },
  { slug: 'baumes-huiles-demaquillantes', aliases: ['baume – huile nettoyant', 'baume - huile nettoyant'], name: { fr: 'Huiles & baumes démaquillants', en: 'Cleansing oils & balms', ar: 'زيوت وبلسم التنظيف' } },
  { slug: 'toners', aliases: ['toner'], name: { fr: 'Toners', en: 'Toners', ar: 'تونر' } },
  { slug: 'toner-pads', aliases: ['toner pads', 'pad'], name: { fr: 'Toner pads', en: 'Toner pads', ar: 'وسادات التونر' } },
  { slug: 'essences', aliases: ['essence'], name: { fr: 'Essences', en: 'Essences', ar: 'إيسنس' } },
  { slug: 'serums', aliases: ['sérum'], name: { fr: 'Sérums & ampoules', en: 'Serums & ampoules', ar: 'سيروم وأمبولات' } },
  { slug: 'emulsions', aliases: ['émulsion'], name: { fr: 'Émulsions & lotions', en: 'Emulsions & lotions', ar: 'مستحلبات ولوشن' } },
  { slug: 'cremes', aliases: ['créme'], name: { fr: 'Crèmes hydratantes', en: 'Moisturizers', ar: 'كريمات مرطبة' } },
  { slug: 'contour-des-yeux', aliases: ['créme pour les yeux'], name: { fr: 'Contour des yeux', en: 'Eye care', ar: 'العناية بمحيط العين' } },
  { slug: 'protection-solaire', aliases: ['protection solaire'], name: { fr: 'Protection solaire', en: 'Sunscreen', ar: 'واقي الشمس' } },
  { slug: 'masques', aliases: ['masque', 'masque à l’argile'], name: { fr: 'Masques', en: 'Masks', ar: 'أقنعة' } },
  { slug: 'exfoliants', aliases: ['exfoliant'], name: { fr: 'Exfoliants', en: 'Exfoliators', ar: 'مقشرات' } },
  { slug: 'soins-apaisants', aliases: ['soin apaisant'], name: { fr: 'Soins apaisants', en: 'Soothing care', ar: 'عناية مهدئة' } },
  { slug: 'brumes', aliases: ['brume'], name: { fr: 'Brumes', en: 'Mists', ar: 'بخاخات' } },
  { slug: 'patchs', aliases: ['patch'], name: { fr: 'Patchs', en: 'Patches', ar: 'لصقات' } },
];

/* --------------------------------- Routines --------------------------------- */

const SKIN = {
  mixte: { fr: 'mixte', en: 'Combination', ar: 'المختلطة' },
  normale: { fr: 'normale', en: 'Normal', ar: 'العادية' },
  seche: { fr: 'sèche', en: 'Dry', ar: 'الجافة' },
  grasse: { fr: 'grasse', en: 'Oily', ar: 'الدهنية' },
};
const CONCERNS = {
  rougeurs: { fr: 'rougeurs', en: 'redness', ar: 'الاحمرار' },
  acne: { fr: 'acné', en: 'acne', ar: 'حب الشباب' },
  taches: { fr: 'taches', en: 'dark spots', ar: 'البقع الداكنة' },
  'points-noirs': { fr: 'points noirs', en: 'blackheads', ar: 'الرؤوس السوداء' },
};

/** "Routine Mixte Acné et Taches" -> { slug: 'routine-mixte-acne-taches', name: {...} } */
function parseRoutine(label) {
  const words = slugify(label).replace(/^routine-/, '').replace(/^peau-/, '');
  const skinKey = Object.keys(SKIN).find((k) => words.startsWith(k));
  if (!skinKey) return null;
  const rest = words.slice(skinKey.length).replace(/^-/, '');
  const concerns = Object.keys(CONCERNS).filter((k) => rest.includes(k));
  const skin = SKIN[skinKey];
  const join = (lang, sep) => concerns.map((c) => CONCERNS[c][lang]).join(sep);
  return {
    slug: ['routine', skinKey, ...concerns].join('-'),
    name: concerns.length
      ? {
          fr: `Routine peau ${skin.fr} · ${join('fr', ' & ')}`,
          en: `${skin.en} skin routine · ${join('en', ' & ')}`,
          ar: `روتين البشرة ${skin.ar} · ${join('ar', ' و')}`,
        }
      : { fr: `Routine peau ${skin.fr}`, en: `${skin.en} skin routine`, ar: `روتين البشرة ${skin.ar}` },
  };
}

/* ---------------------------------- Brands ---------------------------------- */

const BRANDS = [
  ["I'm From", ["i'm from", 'i’m from', 'im from']],
  ['Dr. Althea', ['dr althea', 'dr. althea']],
  ['Anua', ['anua']],
  ['Mixsoon', ['mixsoon']],
  ['COSRX', ['cosrx']],
  ['SKIN1004', ['skin 1004', 'skin1004', 'kin1004']],
  ['Numbuzin', ['numbuzin']],
  ['Round Lab', ['roundlab', 'round lab']],
  ['Beauty of Joseon', ['beauty of joseon', 'beauty of jeoson']],
  ['TIRTIR', ['tirtir']],
  ['Abib', ['abib']],
  ['Medicube', ['medicube']],
  ['Isntree', ['isntree']],
  ['Biodance', ['biodance']],
  ['VT Cosmetics', ['vt cosmetics', 'vt cosmetic']],
  ['Celimax', ['celimax']],
  ['Heimish', ['heimish']],
  ['Eqqualberry', ['eqqualberry']],
  ['Some By Mi', ['somebymi', 'some by mi']],
  ['Goodal', ['goodal']],
  ['Haruharu Wonder', ['haruharu wonder', 'haruharu']],
  ['The Ordinary', ['the ordinary']],
  ['Etude', ['etude']],
  ['Purito', ['purito']],
  ['Axis-Y', ['axis-y', 'axis y']],
  ['Arencia', ['arencia']],
  ['Jumiso', ['jumiso']],
  ['iUNIK', ['iunik']],
  ['House of Hur', ['house of hur']],
  ['Cos De Baha', ['cos de baha']],
  ['Aprilskin', ['aprilskin', 'april skin']],
  ['Beplain', ['beplain']],
];

function detectBrand(product) {
  const haystacks = [...product.categories, ...product.tags].map((s) => s.toLowerCase().trim());
  const name = product.name.toLowerCase();
  for (const [brand, aliases] of BRANDS) {
    if (haystacks.some((h) => aliases.some((a) => h === a || h.startsWith(`${a} `)))) return brand;
  }
  return BRANDS.find(([, aliases]) => aliases.some((a) => name.includes(a)))?.[0] ?? null;
}

/* ---------------------------------- Helpers --------------------------------- */

const cleanText = (html = '') =>
  stripHtml(
    String(html)
      .replace(/\r?\\n|\r\n|\n/g, '\n')
      .replace(/<\/(p|li|h\d)>|<br\s*\/?>/gi, '\n'),
  )
    .replace(/\s*\n\s*/g, '\n')
    .trim();

/** Keeps paragraphs: stripHtml would collapse newlines, so split first. */
const toParagraphs = (html = '') =>
  String(html)
    .replace(/\r?\\n|\r\n/g, '\n')
    .replace(/<\/(p|li|h\d)>|<br\s*\/?>/gi, '\n')
    .split(/\n+/)
    .map((p) => stripHtml(p))
    .filter(Boolean)
    .join('\n\n');

const i18n = (fr) => ({ fr, en: '', ar: '' });

async function upsert(table, slug, insertSql, params) {
  const existing = await query(`SELECT id FROM ${table} WHERE slug = $1`, [slug]);
  if (existing.rows[0]) return existing.rows[0].id;
  return (await query(insertSql, params)).rows[0].id;
}

/* ----------------------------------- Main ----------------------------------- */

async function seed() {
  await migrate();

  // Owner account
  const { rowCount } = await query('SELECT 1 FROM admins');
  if (!rowCount) {
    await query('INSERT INTO admins (name, email, password_hash, role) VALUES ($1, lower($2), $3, $4)', [
      config.admin.name,
      config.admin.email,
      await bcrypt.hash(config.admin.password, 12),
      'owner',
    ]);
    console.log(`Created owner admin ${config.admin.email}`);
  }

  const typeIds = new Map();
  for (const [position, t] of TYPES.entries()) {
    const id = await upsert(
      'categories',
      t.slug,
      `INSERT INTO categories (slug, kind, name, position) VALUES ($1, 'type', $2, $3) RETURNING id`,
      [t.slug, t.name, position],
    );
    t.aliases.forEach((a) => typeIds.set(a, id));
  }

  const products = JSON.parse(await readFile(path.join(projectRoot, 'seed_products.json'), 'utf8'));
  const brandIds = new Map();
  const routineIds = new Map();
  let imported = 0;

  for (const [index, p] of products.entries()) {
    const exists = await query('SELECT 1 FROM products WHERE legacy_id = $1', [p.id]);
    if (exists.rowCount) continue;

    // Brand
    const brandName = detectBrand(p);
    let brandId = null;
    if (brandName) {
      if (!brandIds.has(brandName)) {
        const slug = slugify(brandName);
        brandIds.set(brandName, await upsert('brands', slug, 'INSERT INTO brands (slug, name) VALUES ($1, $2) RETURNING id', [slug, brandName]));
      }
      brandId = brandIds.get(brandName);
    }

    // Categories (types + routines)
    const categoryIds = new Set();
    for (const raw of p.categories) {
      const key = raw.toLowerCase().trim();
      if (typeIds.has(key)) categoryIds.add(typeIds.get(key));
      if (key.startsWith('routine')) {
        const routine = parseRoutine(raw);
        if (!routine) continue;
        if (!routineIds.has(routine.slug)) {
          routineIds.set(
            routine.slug,
            await upsert('categories', routine.slug, `INSERT INTO categories (slug, kind, name, position) VALUES ($1, 'routine', $2, $3) RETURNING id`, [
              routine.slug,
              routine.name,
              routine.slug.split('-').length * 10, // general routines first
            ]),
          );
        }
        categoryIds.add(routineIds.get(routine.slug));
      }
    }

    // Prices: WooCommerce sale price becomes the selling price, regular becomes the struck-through one
    const regular = Number(p.regular_price) || 0;
    const sale = Number(p.sale_price) || 0;
    const price = sale || regular;
    const compareAt = sale && regular > sale ? regular : null;

    const name = p.name.replace(/^KIN1004/, 'SKIN1004').trim();
    let slug = slugify(name);
    if ((await query('SELECT 1 FROM products WHERE slug = $1', [slug])).rowCount) slug = `${slug}-${p.id}`;

    // Images first (slowest part) so a failure leaves no half-imported product
    const images = [];
    for (const rel of p.all_local_images || []) {
      try {
        const buffer = await readFile(path.join(projectRoot, rel));
        images.push(await storeImage(buffer, 'products'));
      } catch (err) {
        console.warn(`  image skipped ${rel}: ${err.message}`);
      }
    }

    const { rows: [row] } = await query(
      `INSERT INTO products (slug, legacy_id, sku, brand_id, name, short_description, description, price, compare_at_price,
                             stock, is_active, is_featured, is_new, sales_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [
        slug, p.id, p.sku || null, brandId, i18n(name), i18n(cleanText(p.short_description)), i18n(toParagraphs(p.description)),
        price, compareAt, 50, price > 0 && images.length > 0,
        index < 12, // the export is ordered by popularity: first items become featured
        index >= products.length - 12,
        Math.max(products.length - index, 0),
      ],
    );

    for (const [position, img] of images.entries()) {
      await query(
        'INSERT INTO product_images (product_id, url, thumb_url, storage_key, alt, position) VALUES ($1,$2,$3,$4,$5,$6)',
        [row.id, img.url, img.thumbUrl, img.key, name, position],
      );
    }
    if (categoryIds.size) {
      await query('INSERT INTO product_categories (product_id, category_id) SELECT $1, unnest($2::int[])', [row.id, [...categoryIds]]);
    }
    imported += 1;
    console.log(`[${index + 1}/${products.length}] ${name} (${images.length} images)`);
  }

  // Feature the brands with the most products
  await query(
    `UPDATE brands SET is_featured = true WHERE id IN (
       SELECT brand_id FROM products WHERE brand_id IS NOT NULL GROUP BY brand_id ORDER BY count(*) DESC LIMIT 10)`,
  );
  console.log(`Seed complete: ${imported} products imported.`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
