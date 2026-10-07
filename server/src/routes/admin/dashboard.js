import { Router } from 'express';
import { query } from '../../db/pool.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 365);

  const [totals, daily, statuses, top, recent, lowStock, cities] = await Promise.all([
    query(
      `SELECT
         count(*) FILTER (WHERE created_at >= now() - make_interval(days => $1)) AS orders,
         COALESCE(sum(total) FILTER (WHERE status NOT IN ('cancelled','returned') AND created_at >= now() - make_interval(days => $1)), 0) AS revenue,
         COALESCE(avg(total) FILTER (WHERE status NOT IN ('cancelled','returned') AND created_at >= now() - make_interval(days => $1)), 0) AS avg_order,
         count(*) FILTER (WHERE status = 'pending') AS pending,
         COALESCE(sum(total) FILTER (WHERE status = 'delivered' AND created_at >= now() - make_interval(days => $1)), 0) AS collected,
         count(*) FILTER (WHERE created_at >= now() - make_interval(days => $1 * 2) AND created_at < now() - make_interval(days => $1)) AS prev_orders,
         COALESCE(sum(total) FILTER (WHERE status NOT IN ('cancelled','returned') AND created_at >= now() - make_interval(days => $1 * 2) AND created_at < now() - make_interval(days => $1)), 0) AS prev_revenue
       FROM orders`,
      [days],
    ),
    query(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date,
              COALESCE(count(o.id), 0) AS orders,
              COALESCE(sum(o.total) FILTER (WHERE o.status NOT IN ('cancelled','returned')), 0) AS revenue
         FROM generate_series(current_date - ($1 - 1), current_date, interval '1 day') d
         LEFT JOIN orders o ON o.created_at::date = d::date
        GROUP BY d ORDER BY d`,
      [days],
    ),
    query(`SELECT status, count(*) AS count FROM orders GROUP BY status`),
    query(
      `SELECT oi.product_id, oi.name, max(oi.image_url) AS image, sum(oi.quantity) AS quantity, sum(oi.line_total) AS revenue
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE o.status NOT IN ('cancelled','returned') AND o.created_at >= now() - make_interval(days => $1)
        GROUP BY oi.product_id, oi.name ORDER BY quantity DESC LIMIT 6`,
      [days],
    ),
    query(`SELECT id, number, customer_name, city, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 8`),
    query(
      `SELECT p.id, p.slug, p.name->>'fr' AS name, p.stock,
              (SELECT thumb_url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1) AS image
         FROM products p WHERE p.is_active AND p.stock <= 5 ORDER BY p.stock ASC LIMIT 8`,
    ),
    query(
      `SELECT initcap(lower(city)) AS city, count(*) AS orders FROM orders
        WHERE created_at >= now() - make_interval(days => $1) GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
      [days],
    ),
  ]);

  const [{ count: products }] = (await query('SELECT count(*) FROM products WHERE is_active')).rows;
  const [{ count: subscribers }] = (await query('SELECT count(*) FROM newsletter_subscribers')).rows;

  res.json({
    days,
    totals: { ...totals.rows[0], products, subscribers },
    daily: daily.rows,
    statuses: statuses.rows,
    topProducts: top.rows,
    recentOrders: recent.rows,
    lowStock: lowStock.rows,
    cities: cities.rows,
  });
});
