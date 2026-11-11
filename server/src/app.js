import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './config.js';
import { attachRequestDb, pool } from './db/pool.js';
import { cfEnv, onWorkers } from './lib/runtime.js';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin/index.js';
import { chatRouter } from './routes/chat.js';
import { seoRouter, renderIndex } from './seo.js';
import { LOCAL_UPLOAD_DIR, storageDriver } from './lib/storage.js';
import { errorHandler, notFound } from './middleware/errors.js';

// import.meta.url is empty on Cloudflare Workers (no file system there)
const root = import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd();

/** The built client when it sits next to the server (local / single-server hosting). */
const templatePath = [path.resolve(root, '../../client/dist/index.html'), path.join(process.cwd(), 'client/dist/index.html')].find((p) =>
  existsSync(p),
);
export const clientDist = templatePath ? path.dirname(templatePath) : null;

let cachedTemplate = null;

/**
 * The SPA shell that receives the SEO tags.
 * - Local / VPS: read from client/dist (re-read in development so a client rebuild is picked up).
 * - Vercel Services: the client is a separate "web" service; WEB_URL is injected by the service binding
 *   declared in vercel.json and is only available at runtime.
 */
async function getTemplate() {
  if (cachedTemplate && (config.isProd || !templatePath)) return cachedTemplate;
  if (cfEnv().ASSETS) {
    // Cloudflare Workers: the built client is in the static assets ("/" is index.html)
    const res = await cfEnv().ASSETS.fetch(new Request('https://assets.local/'));
    cachedTemplate = await res.text();
  } else if (templatePath) {
    cachedTemplate = await readFile(templatePath, 'utf8');
  } else if (process.env.WEB_URL) {
    const res = await fetch(new URL('index.html', process.env.WEB_URL.replace(/\/?$/, '/')));
    if (!res.ok) throw new Error(`Could not load the client shell from the web service (${res.status})`);
    cachedTemplate = await res.text();
  }
  return cachedTemplate;
}

export const app = express();
app.set('trust proxy', 1);
// Behind the Cloudflare Worker, the visitor's IP arrives in X-Client-IP. It is trusted only with the shared
// PROXY_SECRET, so rate limits (login, orders, chat) apply per visitor instead of to the Worker as a whole.
app.use((req, _res, next) => {
  // On Cloudflare the edge sets cf-connecting-ip itself (visitors cannot fake it)
  if (onWorkers && req.get('cf-connecting-ip')) {
    Object.defineProperty(req, 'ip', { value: req.get('cf-connecting-ip'), configurable: true });
    return next();
  }
  const ip = req.get('x-client-ip');
  if (process.env.PROXY_SECRET && ip && req.get('x-proxy-secret') === process.env.PROXY_SECRET) {
    Object.defineProperty(req, 'ip', { value: ip, configurable: true });
  }
  next();
});
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: false, // SPA + external image CDN (R2); tighten once the final domain is known
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
// Cloudflare compresses responses at the edge
if (!onWorkers) app.use(compression());
app.use(attachRequestDb);
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
// morgan compiles its formats with new Function(), which Workers forbid; Cloudflare logs requests itself
if (!onWorkers) app.use(morgan(config.isProd ? 'combined' : 'dev'));

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, storage: storageDriver });
});
app.use('/api/admin', adminRouter);
app.use('/api/chat', chatRouter);
// Before the /api 404: serves /api/seo plus robots, sitemap, llms.txt, feeds and the IndexNow key
app.use(seoRouter);
app.use('/api', publicRouter);
app.use('/api', notFound);
app.use('/uploads', express.static(LOCAL_UPLOAD_DIR, { maxAge: '30d', immutable: true }));

// Static files (local production only: on Vercel the CDN serves them before reaching this function)
if (clientDist) {
  app.use(
    express.static(clientDist, {
      index: false,
      setHeaders: (res, file) => {
        if (file.includes(`${path.sep}assets${path.sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );
}

// Every page: the SPA shell with SEO tags and crawler-readable content injected
app.get('/{*splat}', async (req, res, next) => {
  const template = await getTemplate();
  if (!template) return next(); // API-only deployment without a client
  if (req.path.startsWith('/admin')) return res.type('html').send(template);
  // Permanent: Google reads the homepage (favicon, site name) through this redirect
  if (req.path === '/') return res.redirect(301, '/fr');
  res
    .type('html')
    .set('Cache-Control', 'no-cache')
    .set('CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')
    .send(await renderIndex(template, req.path, req.originalUrl.split('?')[1] || ''));
});

app.use(errorHandler);

// Vercel (framework "express") uses the default export as the function handler
export default app;
