/**
 * Gives every product image a descriptive, SEO-friendly file name and alt text:
 *   products/2026/4c05fd95-….webp  ->  products/anua-rice-70-glow-milky-toner-1.webp
 * Objects are copied server-side on R2, the database is updated, then the old objects are deleted.
 * Already renamed images are skipped, so the script is safe to re-run.
 *   npm run db:rename-images
 */
import { pool, query } from './pool.js';
import { copyObject, deleteObject } from '../lib/storage.js';

const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1]) || Infinity;

const thumbOf = (key) => key.replace(/\.webp$/, '-thumb.webp');

async function run() {
  const { rows: products } = await query(
    `SELECT p.id, p.slug, p.name->>'fr' AS name, b.name AS brand
       FROM products p LEFT JOIN brands b ON b.id = p.brand_id ORDER BY p.id`,
  );
  let renamed = 0;
  let skipped = 0;
  for (const p of products.slice(0, limit)) {
    const { rows: images } = await query('SELECT id, storage_key, position FROM product_images WHERE product_id = $1 ORDER BY position, id', [p.id]);
    for (const [i, img] of images.entries()) {
      const target = `products/${p.slug}-${i + 1}.webp`;
      const alt = i === 0 ? `${p.name}${p.brand && !p.name.toLowerCase().includes(p.brand.toLowerCase()) ? ` – ${p.brand}` : ''}` : `${p.name} – photo ${i + 1}`;
      if (!img.storage_key || img.storage_key === target) {
        await query('UPDATE product_images SET alt = $1 WHERE id = $2', [alt, img.id]);
        skipped += 1;
        continue;
      }
      try {
        const [url, thumbUrl] = await Promise.all([copyObject(img.storage_key, target), copyObject(thumbOf(img.storage_key), thumbOf(target))]);
        await query('UPDATE product_images SET url = $1, thumb_url = $2, storage_key = $3, alt = $4 WHERE id = $5', [url, thumbUrl, target, alt, img.id]);
        await Promise.all([deleteObject(img.storage_key), deleteObject(thumbOf(img.storage_key))]);
        renamed += 1;
      } catch (err) {
        console.warn(`  ${p.slug} #${i + 1}: ${err.message}`);
      }
    }
    if (images.length) console.log(`${p.slug}: ${images.length} image(s)`);
  }
  // order_items keep a snapshot of the image URL: point them to the new file too
  await query(
    `UPDATE order_items oi SET image_url = pi.thumb_url
       FROM product_images pi
      WHERE pi.product_id = oi.product_id AND pi.position = 0 AND oi.image_url IS DISTINCT FROM pi.thumb_url`,
  );
  console.log(`Done: ${renamed} renamed, ${skipped} already fine.`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
