import { randomUUID } from 'node:crypto';
import { putObject, deleteObject } from './storage.js';
import { slugify } from './utils.js';

// Full-width banners need more pixels than product shots; the "thumb" doubles as the mobile banner
export const SIZES = {
  default: { full: 1200, thumb: 480 },
  banners: { full: 1920, thumb: 960 },
};

// sharp is a native module: available on Node, not on Cloudflare Workers (stubbed there, see wrangler.jsonc)
let sharpModule;
async function loadSharp() {
  if (sharpModule === undefined) sharpModule = (await import('sharp').then((m) => m.default).catch(() => null)) || null;
  return sharpModule;
}

/**
 * Converts any uploaded image to optimized WebP in two sizes and stores both.
 * The thumb key is derived from the main key (`-thumb` suffix) so a single key is enough to delete both.
 * `nameHint` (e.g. the product name) gives a descriptive, SEO-friendly file name:
 * products/2026/anua-rice-70-glow-milky-toner-k3f9a2.webp (Google Images uses file names as a signal).
 */
export async function storeImage(buffer, folder = 'products', nameHint = '', thumbBuffer = null, type = 'image/webp') {
  const descriptive = slugify(nameHint).slice(0, 70);
  const unique = randomUUID().slice(0, 6);
  const base = `${folder}/${new Date().getFullYear()}/${descriptive ? `${descriptive}-${unique}` : randomUUID()}`;
  const size = SIZES[folder] || SIZES.default;
  let full = buffer;
  let thumb = thumbBuffer;
  if (!thumbBuffer) {
    // Original upload: resize and convert here (Node). The admin normally sends both WebP versions already.
    const sharp = await loadSharp();
    if (!sharp) throw new Error('Image processing unavailable: reload the admin and upload again');
    [full, thumb] = await Promise.all([
      sharp(buffer).rotate().resize({ width: size.full, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
      sharp(buffer).rotate().resize({ width: size.thumb, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(),
    ]);
  }
  // Browsers that cannot encode WebP (some Safari versions) send JPEG
  const [contentType, ext] = thumbBuffer && type === 'image/jpeg' ? ['image/jpeg', 'jpg'] : ['image/webp', 'webp'];
  const [url, thumbUrl] = await Promise.all([
    putObject(`${base}.${ext}`, full, contentType),
    putObject(`${base}-thumb.${ext}`, thumb, contentType),
  ]);
  return { url, thumbUrl, key: `${base}.${ext}` };
}

export async function removeImage(key) {
  if (!key) return;
  await Promise.all([deleteObject(key), deleteObject(key.replace(/\.(webp|jpg)$/, '-thumb.$1'))]);
}
