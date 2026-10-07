const required = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: Number(process.env.PORT || 4000),
  siteUrl: (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/sopure_skin'),
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtSecret: required('JWT_SECRET', isProd ? undefined : 'dev-only-secret-change-me'),
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@sopureskin.com',
    password: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
    name: process.env.ADMIN_NAME || 'Admin',
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/$/, ''),
  },
};

export const r2Enabled = Boolean(
  config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey && config.r2.bucket && config.r2.publicUrl,
);

export const LOCALES = ['fr', 'en', 'ar'];
export const DEFAULT_LOCALE = 'fr';
