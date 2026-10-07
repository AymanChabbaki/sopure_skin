import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { validate } from '../../middleware/errors.js';

export const reviewsRouter = Router();

reviewsRouter.get('/', async (req, res) => {
  const { status = 'pending', page = 1 } = req.query;
  const filter = {
    pending: 'NOT r.is_approved',
    approved: 'r.is_approved AND NOT r.is_sample',
    sample: 'r.is_sample',
    all: 'true',
  }[status] || 'NOT r.is_approved';
  const limit = 25;
  const pg = Math.max(Number(page) || 1, 1);
  const [list, counts] = await Promise.all([
    query(
      `SELECT r.id, r.author_name AS "author", r.city, r.rating, r.body, r.is_approved AS "isApproved",
              r.is_sample AS "isSample", r.created_at AS "createdAt", p.id AS "productId", p.slug, p.name->>'fr' AS "productName"
         FROM reviews r JOIN products p ON p.id = r.product_id
        WHERE ${filter} ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${(pg - 1) * limit}`,
    ),
    query(`SELECT count(*) FILTER (WHERE NOT is_approved) AS pending,
                  count(*) FILTER (WHERE is_approved AND NOT is_sample) AS approved,
                  count(*) FILTER (WHERE is_sample) AS sample,
                  count(*) AS all FROM reviews`),
  ]);
  const c = counts.rows[0];
  res.json({ rows: list.rows, counts: c, page: pg, pages: Math.max(Math.ceil((c[status] ?? c.pending) / limit), 1) });
});

reviewsRouter.patch('/:id', validate(z.object({ isApproved: z.boolean() })), async (req, res) => {
  await query('UPDATE reviews SET is_approved = $1 WHERE id = $2', [req.valid.isApproved, req.params.id]);
  res.json({ ok: true });
});

reviewsRouter.delete('/samples', async (_req, res) => {
  const { rowCount } = await query('DELETE FROM reviews WHERE is_sample');
  res.json({ ok: true, removed: rowCount });
});

reviewsRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});
