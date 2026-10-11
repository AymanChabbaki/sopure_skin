import { createHash } from 'node:crypto';
import { config, LOCALES } from '../config.js';

/**
 * IndexNow: tells Bing (which also feeds ChatGPT search and Copilot), Yandex, Seznam and Naver
 * about changed URLs immediately instead of waiting for the next crawl.
 * The key is derived from JWT_SECRET (stable, no extra variable needed) unless INDEXNOW_KEY is set.
 */
export function indexNowKey() {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY;
  if (!config.jwtSecret) return null;
  return createHash('sha256').update(`indexnow:${config.jwtSecret}`).digest('hex').slice(0, 32);
}

const isPublicSite = () => /^https:\/\//.test(config.siteUrl) && !/localhost|127\.0\.0\.1/.test(config.siteUrl);

/** Every language version of a store path, e.g. "/product/x" -> /fr/product/x, /en/..., /ar/... */
export const localizedUrls = (path) => LOCALES.map((l) => `${config.siteUrl}/${l}${path === '/' ? '' : path}`);

/** Fire-and-forget submission; never blocks or breaks an admin action. */
export async function submitUrls(urls) {
  const key = indexNowKey();
  const list = [...new Set(urls)].filter(Boolean);
  if (!key || !list.length || !isPublicSite()) return { skipped: true };
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(config.siteUrl).host, key, keyLocation: `${config.siteUrl}/${key}.txt`, urlList: list.slice(0, 10000) }),
      signal: AbortSignal.timeout(10000),
    });
    return { status: res.status, count: list.length };
  } catch (err) {
    console.warn('IndexNow submission failed:', err.message);
    return { error: err.message };
  }
}

/** Convenience for admin routes: notify the store paths a change affects. */
export function notifyPaths(paths) {
  submitUrls(paths.flatMap(localizedUrls)).catch(() => null);
}
