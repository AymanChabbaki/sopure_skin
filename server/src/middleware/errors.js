import { ZodError } from 'zod';
import { HttpError } from '../lib/utils.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    req.valid = schema.parse(req[source]);
    next();
  };
}

export function notFound(_req, _res, next) {
  next(new HttpError(404, 'Not found'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err?.code === '23505') return res.status(409).json({ error: 'Already exists', details: err.detail });
  if (err?.name === 'MulterError') return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
