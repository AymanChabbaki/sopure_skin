import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { validate } from '../../middleware/errors.js';
import { AUTH_COOKIE, cookieOptions, requireAdmin, signAdminToken } from '../../middleware/auth.js';
import { HttpError } from '../../lib/utils.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }),
  validate(z.object({ email: z.email(), password: z.string().min(1) })),
  async (req, res) => {
    const { rows: [admin] } = await query('SELECT * FROM admins WHERE lower(email) = lower($1)', [req.valid.email]);
    if (!admin || !(await bcrypt.compare(req.valid.password, admin.password_hash))) {
      throw new HttpError(401, 'Invalid email or password');
    }
    res.cookie(AUTH_COOKIE, signAdminToken(admin), cookieOptions);
    res.json({ id: admin.id, name: admin.name, email: admin.email, role: admin.role });
  },
);

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
  res.json({ ok: true });
});

authRouter.get('/me', requireAdmin, async (req, res) => {
  const { rows: [admin] } = await query('SELECT id, name, email, role FROM admins WHERE id = $1', [req.admin.sub]);
  if (!admin) throw new HttpError(401, 'Account not found');
  res.json(admin);
});
