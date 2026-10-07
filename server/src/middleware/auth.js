import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../lib/utils.js';

export const AUTH_COOKIE = 'sps_admin';

export function signAdminToken(admin) {
  return jwt.sign({ sub: admin.id, role: admin.role, name: admin.name }, config.jwtSecret, { expiresIn: '7d' });
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProd,
  maxAge: 7 * 24 * 3600 * 1000,
  path: '/',
};

export function requireAdmin(req, _res, next) {
  const header = req.headers.authorization;
  const token = req.cookies?.[AUTH_COOKIE] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) throw new HttpError(401, 'Authentication required');
  try {
    req.admin = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    throw new HttpError(401, 'Session expired');
  }
}

export function requireOwner(req, _res, next) {
  if (req.admin?.role !== 'owner') throw new HttpError(403, 'Owner access required');
  next();
}
