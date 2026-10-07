/**
 * Uploads customer testimonial screenshots (WhatsApp captures…) from a folder and adds them
 * to the "testimonials" setting shown on the home page.
 *   npm run db:testimonials -- "../drive-download-folder"
 * Files already imported (same name) are skipped, so it is safe to re-run.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from './pool.js';
import { storeImage } from '../lib/images.js';
import { getSettings, saveSetting } from '../lib/settings.js';

const folder = process.argv[2];

async function run() {
  if (!folder) throw new Error('Usage: npm run db:testimonials -- <folder>');
  const dir = path.resolve(process.cwd(), folder);
  const files = (await readdir(dir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  const current = (await getSettings()).testimonials || [];
  const known = new Set(current.map((t) => t.source));
  const added = [];
  for (const file of files) {
    if (known.has(file)) continue;
    const img = await storeImage(await readFile(path.join(dir, file)), 'testimonials');
    added.push({ url: img.url, thumbUrl: img.thumbUrl, key: img.key, source: file });
    console.log(`uploaded ${file}`);
  }
  await saveSetting('testimonials', [...current, ...added]);
  console.log(`${added.length} added, ${current.length + added.length} testimonials in total.`);
}

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
