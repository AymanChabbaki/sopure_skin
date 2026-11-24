import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { HttpError } from '../../lib/utils.js';
import { validate } from '../../middleware/errors.js';
import { normalizeCode } from '../../lib/promo.js';

export const promosRouter = Router();

const promoSchema = z
  .object({
    code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/, 'Lettres, chiffres, - et _ uniquement'),
    type: z.enum(['percent', 'fixed', 'shipping']),
    value: z.coerce.number().min(0).default(0),
    minSubtotal: z.coerce.number().min(0).default(0),
    maxUses: z.coerce.number().int().positive().nullish(),
    startsAt: z.string().nullish(),
    endsAt: z.string().nullish(),
    isActive: z.boolean().default(true),
  })
  .refine((p) => p.type === 'shipping' || p.value > 0, { message: 'Indiquez la valeur de la réduction', path: ['value'] })
  .refine((p) => p.type !== 'percent' || p.value <= 100, { message: 'Un pourcentage ne peut pas dépasser 100', path: ['value'] });

const COLUMNS = `id, code, type, value::float, min_subtotal::float AS "minSubtotal", max_uses AS "maxUses", uses,
                 starts_at AS "startsAt", ends_at AS "endsAt", is_active AS "isActive", created_at AS "createdAt",
                 (SELECT coalesce(sum(o.discount), 0)::float FROM orders o WHERE o.promo_code = promo_codes.code) AS "totalDiscount"`;

// A second code with the same name: say it in French in the admin toast
const unique = (err) => {
  if (err?.code === '23505') throw new HttpError(409, 'Ce code existe déjà');
  throw err;
};

// Dates come from <input type="date">: the code is valid from the start of startsAt to the end of endsAt (Morocco time)
const values = (d) => [
  normalizeCode(d.code), d.type, d.type === 'shipping' ? 0 : d.value, d.minSubtotal, d.maxUses ?? null,
  d.startsAt ? `${d.startsAt.slice(0, 10)}T00:00:00+01:00` : null,
  d.endsAt ? `${d.endsAt.slice(0, 10)}T23:59:59+01:00` : null,
  d.isActive,
];

promosRouter.get('/', async (_req, res) => {
  const { rows } = await query(`SELECT ${COLUMNS} FROM promo_codes ORDER BY created_at DESC`);
  res.json(rows);
});

promosRouter.post('/', validate(promoSchema), async (req, res) => {
  const { rows: [row] } = await query(
    `INSERT INTO promo_codes (code, type, value, min_subtotal, max_uses, starts_at, ends_at, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    values(req.valid),
  ).catch(unique);
  res.status(201).json(row);
});

promosRouter.put('/:id', validate(promoSchema), async (req, res) => {
  const { rowCount } = await query(
    `UPDATE promo_codes SET code=$1, type=$2, value=$3, min_subtotal=$4, max_uses=$5, starts_at=$6, ends_at=$7, is_active=$8 WHERE id=$9`,
    [...values(req.valid), req.params.id],
  ).catch(unique);
  if (!rowCount) throw new HttpError(404, 'Promo code not found');
  res.json({ ok: true });
});

promosRouter.patch('/:id', validate(z.object({ isActive: z.boolean() })), async (req, res) => {
  await query('UPDATE promo_codes SET is_active = $1 WHERE id = $2', [req.valid.isActive, req.params.id]);
  res.json({ ok: true });
});

promosRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM promo_codes WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});
