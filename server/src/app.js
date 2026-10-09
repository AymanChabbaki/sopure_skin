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
import { pool } from './db/pool.js';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin/index.js';
import { chatRouter } from './routes/chat.js';
import { seoRouter, renderIndex } from './seo.js';
import { LOCAL_UPLOAD_DIR, storageDriver } from './lib/storage.js';
import { errorHandler, notFound } from './middleware/errors.js';

const root = path.dirname(fileURLToPath(import.meta.url));

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
  if (templatePath) {
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
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: false, // SPA + external image CDN (R2); tighten once the final domain is known
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(compression());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(morgan(config.isProd ? 'combined' : 'dev'));

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, storage: storageDriver });
});
app.use('/api/admin', adminRouter);
app.use('/api/chat', chatRouter);
app.use('/api', publicRouter);
app.use('/api', notFound);
app.use('/uploads', express.static(LOCAL_UPLOAD_DIR, { maxAge: '30d', immutable: true }));
app.use(seoRouter);

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
  if (req.path === '/') return res.redirect(302, '/fr');
  res
    .type('html')
    .set('Cache-Control', 'no-cache')
    .set('CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')
    .send(await renderIndex(template, req.path));
});

app.use(errorHandler);

// Vercel (framework "express") uses the default export as the function handler
export default app;
