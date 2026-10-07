import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { putObject, deleteObject } from './storage.js';

// Full-width banners need more pixels than product shots; the "thumb" doubles as the mobile banner
const SIZES = {
  default: { full: 1200, thumb: 480 },
  banners: { full: 1920, thumb: 960 },
};

/**
 * Converts any uploaded image to optimized WebP in two sizes and stores both.
 * The thumb key is derived from the main key (`-thumb` suffix) so a single key is enough to delete both.
 */
export async function storeImage(buffer, folder = 'products') {
  const base = `${folder}/${new Date().getFullYear()}/${randomUUID()}`;
  const size = SIZES[folder] || SIZES.default;
  const [full, thumb] = await Promise.all([
    sharp(buffer).rotate().resize({ width: size.full, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    sharp(buffer).rotate().resize({ width: size.thumb, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(),
  ]);
  const [url, thumbUrl] = await Promise.all([
    putObject(`${base}.webp`, full, 'image/webp'),
    putObject(`${base}-thumb.webp`, thumb, 'image/webp'),
  ]);
  return { url, thumbUrl, key: `${base}.webp` };
}

export async function removeImage(key) {
  if (!key) return;
  await Promise.all([deleteObject(key), deleteObject(key.replace(/\.webp$/, '-thumb.webp'))]);
}
