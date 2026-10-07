import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../../db/pool.js';
import { HttpError } from '../../lib/utils.js';
import { validate } from '../../middleware/errors.js';

export const ordersRouter = Router();

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];
// Statuses where the goods are back in (or never left) the shop
const RESTOCKED = new Set(['cancelled', 'returned']);

ordersRouter.get('/', async (req, res) => {
  const { q, status, city, from, to, page = 1, limit = 20 } = req.query;
  const where = [];
  const params = [];
  const add = (v) => {
    params.push(v);
    return `$${params.length}`;
  };

  if (q) {
    const t = add(`%${q}%`);
    where.push(`(number ILIKE ${t} OR customer_name ILIKE ${t} OR phone ILIKE ${t})`);
  }
  if (status && STATUSES.includes(status)) where.push(`status = ${add(status)}`);
  if (city) where.push(`city ILIKE ${add(city)}`);
  if (from) where.push(`created_at >= ${add(from)}`);
  if (to) where.push(`created_at < (${add(to)}::date + 1)`);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const lim = Math.min(Number(limit) || 20, 100);
  const pg = Math.max(Number(page) || 1, 1);

  const [list, count, counts] = await Promise.all([
    query(
      `SELECT id, number, customer_name AS "customerName", phone, city, items_count AS "itemsCount",
              total, shipping_fee AS "shippingFee", status, created_at AS "createdAt"
         FROM orders ${whereSql} ORDER BY created_at DESC LIMIT ${lim} OFFSET ${(pg - 1) * lim}`,
      params,
    ),
    query(`SELECT count(*) FROM orders ${whereSql}`, params),
    query(`SELECT status, count(*) FROM orders GROUP BY status`),
  ]);
  const total = count.rows[0].count;
  res.json({
    rows: list.rows,
    total,
    page: pg,
    pages: Math.max(Math.ceil(total / lim), 1),
    statusCounts: Object.fromEntries(counts.rows.map((r) => [r.status, r.count])),
  });
});

ordersRouter.get('/export.csv', async (_req, res) => {
  const { rows } = await query(
    `SELECT number, created_at, customer_name, phone, city, address, items_count, subtotal, shipping_fee, total, status
       FROM orders ORDER BY created_at DESC`,
  );
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = 'number,created_at,customer_name,phone,city,address,items_count,subtotal,shipping_fee,total,status';
  const body = rows
    .map((r) => Object.values(r).map((v) => esc(v instanceof Date ? v.toISOString() : v)).join(','))
    .join('\n');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`﻿${header}\n${body}`);
});

ordersRouter.get('/:id', async (req, res) => {
  const { rows: [order] } = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!order) throw new HttpError(404, 'Order not found');
  const { rows: items } = await query(
    `SELECT oi.*, p.slug FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE order_id = $1 ORDER BY oi.id`,
    [order.id],
  );
  res.json({ ...order, items });
});

ordersRouter.patch(
  '/:id',
  validate(z.object({ status: z.enum(STATUSES).optional(), adminNotes: z.string().max(2000).optional() })),
  async (req, res) => {
    const { status, adminNotes } = req.valid;
    await withTransaction(async (db) => {
      const { rows: [order] } = await db.query('SELECT id, status FROM orders WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (!order) throw new HttpError(404, 'Order not found');

      if (status && status !== order.status) {
        const wasOut = !RESTOCKED.has(order.status);
        const willBeOut = !RESTOCKED.has(status);
        // Give stock back when an order is cancelled/returned, take it again if it is reopened
        if (wasOut !== willBeOut) {
          const sign = willBeOut ? -1 : 1;
          await db.query(
            `UPDATE products p SET stock = GREATEST(p.stock + $1 * oi.quantity, 0),
                                   sales_count = GREATEST(p.sales_count - $1 * oi.quantity, 0)
               FROM order_items oi WHERE oi.order_id = $2 AND oi.product_id = p.id`,
            [sign, order.id],
          );
        }
      }
      await db.query(
        `UPDATE orders SET status = COALESCE($1, status), admin_notes = COALESCE($2, admin_notes), updated_at = now() WHERE id = $3`,
        [status ?? null, adminNotes ?? null, order.id],
      );
    });
    res.json({ ok: true });
  },
);

ordersRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM orders WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});
