import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { query } from '../../db/pool.js';
import { notifyPaths } from '../../lib/indexnow.js';
import { flushPublish, markChanged } from '../../lib/publish.js';
import { authRouter } from './auth.js';
import { dashboardRouter } from './dashboard.js';
import { productsRouter } from './products.js';
import { categoriesRouter, brandsRouter } from './taxonomy.js';
import { ordersRouter } from './orders.js';
import { reviewsRouter } from './reviews.js';
import { articlesRouter } from './articles.js';
import { packsRouter, videosRouter } from './packs.js';
import { statsRouter } from './stats.js';
import { settingsRouter, uploadsRouter, teamRouter, subscribersRouter } from './system.js';

export const adminRouter = Router();

adminRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
adminRouter.use('/auth', authRouter);
adminRouter.use(requireAdmin);

/**
 * Publishing the static storefront after admin changes.
 * Everything runs BEFORE the route answers: on Cloudflare Workers, work started after the response is sent is
 * cancelled, so a 'finish' hook would silently never mark the change. Marking first is harmless if the change then
 * fails (one extra rebuild), and the rebuild starts reading the database long after the route has committed.
 * A cron trigger (worker.js) also flushes pending changes every 5 minutes, even when the admin is closed.
 */
// Resources whose changes are visible on the storefront (uploads, team, subscribers… are not)
const PUBLIC_RESOURCES = new Set(['products', 'categories', 'brands', 'articles', 'settings', 'reviews', 'packs', 'videos', 'orders']);

async function changedPaths(resource, id, body) {
  const paths = ['/', '/shop'];
  if (resource === 'products') {
    const ids = id && /^\d+$/.test(id) ? [Number(id)] : body?.ids || [];
    if (ids.length) {
      const { rows } = await query('SELECT slug FROM products WHERE id = ANY($1)', [ids]);
      rows.forEach((r) => paths.push(`/product/${r.slug}`));
    }
  } else if (resource === 'categories' || resource === 'brands') {
    paths.push(resource === 'brands' ? '/brands' : '/shop');
    if (id && /^\d+$/.test(id)) {
      const { rows } = await query(`SELECT slug FROM ${resource} WHERE id = $1`, [id]);
      rows.forEach((r) => paths.push(`/${resource === 'brands' ? 'brand' : 'category'}/${r.slug}`));
    }
  } else if (resource === 'articles') {
    paths.push('/guides');
    if (id && /^\d+$/.test(id)) {
      const { rows } = await query('SELECT slug FROM articles WHERE id = $1 AND is_published', [id]);
      rows.forEach((r) => paths.push(`/guides/${r.slug}`));
    }
  }
  return paths;
}

adminRouter.use(async (req, _res, next) => {
  try {
    if (req.method === 'GET') {
      // Admin reads (the dashboard polls every minute) publish changes that were waiting for the delay
      await flushPublish();
      return next();
    }
    const [, resource, id] = req.path.split('/');
    // Actions that change nothing public (publish button, IndexNow ping, test email)
    const silent = resource === 'settings' && ['publish', 'indexnow', 'email'].includes(id);
    if (PUBLIC_RESOURCES.has(resource) && !silent) {
      // Orders: a cancelled or returned order puts items back in stock (no page to ping)
      if (resource !== 'orders') await notifyPaths(await changedPaths(resource, id, req.body));
      await markChanged();
      await flushPublish();
    }
  } catch (err) {
    console.error('Publish hook failed:', err.message); // best effort: never block the admin
  }
  next();
});
adminRouter.use('/dashboard', dashboardRouter);
adminRouter.use('/stats', statsRouter);
adminRouter.use('/products', productsRouter);
adminRouter.use('/categories', categoriesRouter);
adminRouter.use('/brands', brandsRouter);
adminRouter.use('/orders', ordersRouter);
adminRouter.use('/reviews', reviewsRouter);
adminRouter.use('/articles', articlesRouter);
adminRouter.use('/packs', packsRouter);
adminRouter.use('/videos', videosRouter);
adminRouter.use('/settings', settingsRouter);
adminRouter.use('/uploads', uploadsRouter);
adminRouter.use('/team', teamRouter);
adminRouter.use('/subscribers', subscribersRouter);
