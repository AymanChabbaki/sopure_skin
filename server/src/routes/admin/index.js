import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { authRouter } from './auth.js';
import { dashboardRouter } from './dashboard.js';
import { productsRouter } from './products.js';
import { categoriesRouter, brandsRouter } from './taxonomy.js';
import { ordersRouter } from './orders.js';
import { reviewsRouter } from './reviews.js';
import { settingsRouter, uploadsRouter, teamRouter, subscribersRouter } from './system.js';

export const adminRouter = Router();

adminRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
adminRouter.use('/auth', authRouter);
adminRouter.use(requireAdmin);
adminRouter.use('/dashboard', dashboardRouter);
adminRouter.use('/products', productsRouter);
adminRouter.use('/categories', categoriesRouter);
adminRouter.use('/brands', brandsRouter);
adminRouter.use('/orders', ordersRouter);
adminRouter.use('/reviews', reviewsRouter);
adminRouter.use('/settings', settingsRouter);
adminRouter.use('/uploads', uploadsRouter);
adminRouter.use('/team', teamRouter);
adminRouter.use('/subscribers', subscribersRouter);
