const required = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

const isProd = process.env.NODE_ENV === 'production';

/**
 * Public URL used in canonical tags, hreflang, sitemap, Open Graph and JSON-LD.
 * SITE_URL should always be set in production (e.g. https://www.sopureskin.com). Without it, fall back to
 * the production domain Vercel exposes, never to localhost: a localhost canonical blocks indexing.
 */
function resolveSiteUrl() {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelDomain) {
    console.warn(`SITE_URL is not set: using https://${vercelDomain}. Set SITE_URL to your final domain in Vercel.`);
    return `https://${vercelDomain}`;
  }
  return 'http://localhost:5173';
}

const siteUrl = resolveSiteUrl();

export const config = {
  isProd,
  port: Number(process.env.PORT || 4000),
  siteUrl,
  corsOrigins: (process.env.CORS_ORIGINS || siteUrl).split(',').map((s) => s.trim()),
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
