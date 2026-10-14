import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { validate } from '../../middleware/errors.js';

export const statsRouter = Router();

// Sales are counted on the shop's local calendar, and cancelled/returned orders never count
const LOCAL_DAY = `(o.created_at AT TIME ZONE 'Africa/Casablanca')::date`;
const SOLD = `o.status NOT IN ('cancelled','returned')`;

/**
 * Sales statistics for a period. `from`/`to` are inclusive local dates (YYYY-MM-DD);
 * leaving both out means "since the first order".
 */
statsRouter.get(
  '/',
  validate(z.object({ from: z.iso.date().optional(), to: z.iso.date().optional() }), 'query'),
  async (req, res) => {
    const { from, to } = req.valid;
    const { rows: [bounds] } = await query(
      `SELECT to_char(COALESCE($1::date, min(${LOCAL_DAY}), current_date), 'YYYY-MM-DD') AS from,
              to_char(COALESCE($2::date, (now() AT TIME ZONE 'Africa/Casablanca')::date), 'YYYY-MM-DD') AS to
         FROM orders o`,
      [from ?? null, to ?? null],
    );
    const range = [bounds.from, bounds.to];
    const span = (new Date(bounds.to) - new Date(bounds.from)) / 86400000 + 1;
    // Long periods are grouped by month so the chart stays readable
    const unit = span > 92 ? 'month' : 'day';
    const inRange = `${LOCAL_DAY} BETWEEN $1::date AND $2::date`;

    const [summary, timeline, top, categories, brands, products] = await Promise.all([
      query(
        `SELECT count(*) FILTER (WHERE ${SOLD}) AS orders,
                count(*) FILTER (WHERE NOT ${SOLD}) AS cancelled,
                COALESCE(sum(o.total) FILTER (WHERE ${SOLD}), 0) AS revenue,
                COALESCE(avg(o.total) FILTER (WHERE ${SOLD}), 0) AS avg_order,
                COALESCE(sum(o.items_count) FILTER (WHERE ${SOLD}), 0) AS units,
                COALESCE(sum(o.total) FILTER (WHERE o.status = 'delivered'), 0) AS collected
           FROM orders o WHERE ${inRange}`,
        range,
      ),
      query(
        `SELECT to_char(d, $3) AS date,
                count(o.id) AS orders,
                COALESCE(sum(o.total), 0) AS revenue,
                COALESCE(sum(o.items_count), 0) AS units
           FROM generate_series(date_trunc($4::text, $1::date::timestamp), $2::date::timestamp, ('1 ' || $4)::interval) d
           LEFT JOIN orders o ON date_trunc($4::text, ${LOCAL_DAY}::timestamp) = d AND ${SOLD} AND ${inRange}
          GROUP BY d ORDER BY d`,
        [...range, unit === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD', unit],
      ),
      query(
        `SELECT oi.product_id AS "productId", p.slug, COALESCE(p.name->>'fr', max(oi.name)) AS name,
                COALESCE((SELECT thumb_url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1), max(oi.image_url)) AS image,
                sum(oi.quantity) AS units, sum(oi.line_total) AS revenue, count(DISTINCT o.id) AS orders
           FROM order_items oi JOIN orders o ON o.id = oi.order_id LEFT JOIN products p ON p.id = oi.product_id
          WHERE ${SOLD} AND ${inRange}
          GROUP BY oi.product_id, p.id ORDER BY units DESC, revenue DESC LIMIT 10`,
        range,
      ),
      query(
        `SELECT c.name->>'fr' AS name, c.slug, sum(oi.quantity) AS units, sum(oi.line_total) AS revenue
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
           JOIN product_categories pc ON pc.product_id = oi.product_id
           JOIN categories c ON c.id = pc.category_id AND c.kind = 'type'
          WHERE ${SOLD} AND ${inRange}
          GROUP BY c.id ORDER BY units DESC LIMIT 10`,
        range,
      ),
      query(
        `SELECT b.name, sum(oi.quantity) AS units, sum(oi.line_total) AS revenue
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
           JOIN products p ON p.id = oi.product_id JOIN brands b ON b.id = p.brand_id
          WHERE ${SOLD} AND ${inRange}
          GROUP BY b.id ORDER BY units DESC LIMIT 8`,
        range,
      ),
      query(
        `SELECT p.id, p.slug, p.name->>'fr' AS name, b.name AS brand, p.price, p.stock, p.is_active AS "isActive",
                p.has_sizes AS "hasSizes", p.sizes, to_char(p.expires_at, 'YYYY-MM-DD') AS "expiresAt",
                p.sales_count AS "lifetimeUnits",
                (SELECT thumb_url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1) AS image,
                COALESCE(s.units, 0) AS units, COALESCE(s.revenue, 0) AS revenue, COALESCE(s.orders, 0) AS orders,
                s.last_sold AS "lastSoldAt"
           FROM products p LEFT JOIN brands b ON b.id = p.brand_id
           LEFT JOIN (
             SELECT oi.product_id, sum(oi.quantity) AS units, sum(oi.line_total) AS revenue,
                    count(DISTINCT o.id) AS orders, max(o.created_at) AS last_sold
               FROM order_items oi JOIN orders o ON o.id = oi.order_id
              WHERE ${SOLD} AND ${inRange}
              GROUP BY oi.product_id
           ) s ON s.product_id = p.id
          ORDER BY units DESC, p.sales_count DESC, p.id`,
        range,
      ),
    ]);

    res.json({
      from: bounds.from,
      to: bounds.to,
      unit,
      summary: summary.rows[0],
      timeline: timeline.rows,
      topProducts: top.rows,
      topCategories: categories.rows,
      topBrands: brands.rows,
      products: products.rows,
    });
  },
);
