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

/** Admin reads (the dashboard polls every minute) publish changes that were waiting for the 10-minute delay. */
adminRouter.use((req, res, next) => {
  if (req.method === 'GET') res.on('finish', () => flushPublish().catch(() => null));
  next();
});

/**
 * After every successful catalog change, tell search engines (IndexNow) which store pages changed.
 * Runs after the response is sent, so it never slows down or breaks the admin.
 */
adminRouter.use((req, res, next) => {
  if (req.method === 'GET') return next();
  res.on('finish', async () => {
    if (res.statusCode >= 400) return;
    try {
      const [, resource, id] = req.path.split('/');
      // Actions that change nothing public (publish button, IndexNow ping, test email)
      if (resource === 'settings' && ['publish', 'indexnow', 'email'].includes(id)) return;
      const paths = ['/', '/shop'];
      if (resource === 'products') {
        const ids = id && /^\d+$/.test(id) ? [Number(id)] : req.body?.ids || [];
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
      } else if (resource === 'orders') {
        // A cancelled or returned order puts items back in stock: the static pages need the new availability
        await markChanged();
        await flushPublish();
        return;
      } else if (resource !== 'settings' && resource !== 'reviews') {
        return; // uploads, team…: nothing public changed
      }
      notifyPaths(paths);
      // Static storefront pages: rebuild them (at most every 10 minutes, see lib/publish.js)
      await markChanged();
      await flushPublish();
    } catch {
      /* best effort */
    }
  });
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
