/**
 * Pre-renders the storefront into static files after `vite build` (run by the web service build on Vercel):
 * every URL of the sitemap becomes client/dist/<path>.html with its SEO head and crawler content, plus the
 * sitemap, robots.txt, llms files, Merchant feed and IndexNow key. Vercel then serves them from its CDN,
 * so page views and crawlers cost no function CPU. The HTML is produced by the real server code (renderIndex),
 * started locally here, so it is byte-for-byte what the server would answer.
 * Pages created after the deploy fall back to the SPA shell until the next rebuild (lib/publish.js).
 *   node server/scripts/prerender.mjs
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.PRERENDER = '1';
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../../client/dist');
await access(path.join(dist, 'index.html')).catch(() => {
  throw new Error(`Run the client build first: ${dist}/index.html is missing`);
});

const { app } = await import('../src/app.js');
const { pool } = await import('../src/db/pool.js');
const { config } = await import('../src/config.js');
const { indexNowKey } = await import('../src/lib/indexnow.js');

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

async function get(urlPath) {
  const res = await fetch(origin + urlPath);
  if (res.status !== 200) throw new Error(`${urlPath}: HTTP ${res.status}`);
  return res.text();
}

async function save(file, body) {
  const target = path.join(dist, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
}

const started = Date.now();
try {
  // Generated files (served as-is by the CDN)
  const sitemap = await get('/sitemap.xml');
  await Promise.all([
    save('sitemap.xml', sitemap),
    get('/robots.txt').then((t) => save('robots.txt', t)),
    get('/llms.txt').then((t) => save('llms.txt', t)),
    get('/llms-full.txt').then((t) => save('llms-full.txt', t)),
    get('/feeds/google-merchant.xml').then((t) => save('feeds/google-merchant.xml', t)),
  ]);
  const key = indexNowKey();
  if (key) await save(`${key}.txt`, key);

  // Every page listed in the sitemap, saved under its exact URL path without extension (/fr/product/x ->
  // fr/product/x): Vercel serves an exact file before its rewrites, while "x.html" lookups (cleanUrls) come after
  // the SPA fallback rewrite. Paths that are also folders (/fr, /fr/guides) cannot be files: they are saved as
  // .html and mapped by explicit rewrites in vercel.json. Content-Type is set by vercel.json headers.
  const pages = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(config.siteUrl, '')))];
  const folders = new Set(pages.flatMap((p) => p.split('/').slice(1, -1).map((_, i, parts) => `/${parts.slice(0, i + 1).join('/')}`)));
  const REWRITTEN = /^\/(fr|en|ar)(\/guides)?$/;
  const unmapped = pages.filter((p) => folders.has(p) && !REWRITTEN.test(p));
  if (unmapped.length) throw new Error(`Pages that are also folders need a rewrite in vercel.json: ${unmapped.join(', ')}`);
  // Cloudflare (html_handling auto-trailing-slash) maps /fr/shop to fr/shop.html: every page gets .html there
  const onVercel = Boolean(process.env.VERCEL);
  const fileFor = (p) => `${p.replace(/^\//, '')}${!onVercel || folders.has(p) || REWRITTEN.test(p) ? '.html' : ''}`;
  if (!onVercel) {
    // Cloudflare static assets rules: / -> /fr (permanent, as the server does) and long cache for hashed bundles
    await save('_redirects', '/ /fr 301\n');
    await save(
      '_headers',
      '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/hero/*\n  Cache-Control: public, max-age=2592000\n',
    );
  }
  let done = 0;
  const queue = [...pages];
  const worker = async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      const html = await get(p);
      // renderIndex falls back to the bare shell when the page data fails: never publish that
      if (!html.includes('data-ssr')) throw new Error(`${p}: rendered without SEO tags`);
      await save(fileFor(p), html);
      done += 1;
    }
  };
  // A few pages at a time: the database allows only a small pool of connections
  await Promise.all(Array.from({ length: Number(process.env.DATABASE_POOL_MAX) || 5 }, worker));
  console.log(`Pre-rendered ${done} pages in ${Math.round((Date.now() - started) / 1000)} s`);
} finally {
  server.close();
  await pool.end();
}
