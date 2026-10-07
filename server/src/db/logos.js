/**
 * Uploads the brand logos in ./brand-logos/{brand-slug}.webp to storage (R2 or local)
 * and links them to the matching brands. Logos already set from the admin are kept
 * unless the script is run with --force.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, query } from './pool.js';
import { putObject } from '../lib/storage.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'brand-logos');
const force = process.argv.includes('--force');

async function run() {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.webp'));
  let linked = 0;
  for (const file of files) {
    const slug = file.replace(/\.webp$/, '');
    const { rows: [brand] } = await query('SELECT id, logo_url FROM brands WHERE slug = $1', [slug]);
    if (!brand) {
      console.log(`${slug}: no matching brand, skipped`);
      continue;
    }
    if (brand.logo_url && !force) {
      console.log(`${slug}: already has a logo, kept (use --force to replace)`);
      continue;
    }
    const url = await putObject(`brands/logos/${file}`, await readFile(path.join(dir, file)), 'image/webp');
    await query('UPDATE brands SET logo_url = $1 WHERE id = $2', [url, brand.id]);
    linked += 1;
    console.log(`${slug}: ${url}`);
  }
  console.log(`${linked} logo(s) linked.`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
