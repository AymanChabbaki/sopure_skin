import { query } from '../db/pool.js';

/**
 * The storefront pages are pre-rendered as static files at each deploy (server/scripts/prerender.mjs),
 * so they cost no server CPU. When the catalog changes, a new deploy is requested through a Vercel
 * Deploy Hook (DEPLOY_HOOK_URL), at most once every 5 minutes: changes made in between stay "pending"
 * and are published by the next admin request or by the 5-minute cron trigger (worker.js), whichever comes first.
 * State lives in the settings table under the "publish" key: { pending, at (epoch seconds) }.
 */
const MIN_INTERVAL = 300;

export const publishEnabled = () => Boolean(process.env.DEPLOY_HOOK_URL);

async function callHook() {
  const res = await fetch(process.env.DEPLOY_HOOK_URL, { method: 'POST', signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Deploy hook HTTP ${res.status}`);
}

/** Records that public content changed (product, price, stock, settings…). */
export async function markChanged() {
  if (!publishEnabled()) return;
  await query(
    `INSERT INTO settings (key, value) VALUES ('publish', '{"pending": true, "at": 0}')
     ON CONFLICT (key) DO UPDATE SET value = jsonb_set(settings.value, '{pending}', 'true'), updated_at = now()`,
  );
}

/** Starts a rebuild when changes are pending and the last one is old enough (or right away with force). */
export async function flushPublish({ force = false } = {}) {
  if (!publishEnabled()) return { skipped: true };
  const { rows } = await query(
    `INSERT INTO settings (key, value) VALUES ('publish', jsonb_build_object('pending', false, 'at', extract(epoch FROM now())))
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      WHERE $1 OR ((settings.value->>'pending')::boolean AND (settings.value->>'at')::numeric < extract(epoch FROM now()) - ${MIN_INTERVAL})
     RETURNING 1`,
    [force],
  );
  if (!rows.length) return { started: false };
  await callHook();
  return { started: true };
}

export async function publishStatus() {
  const { rows } = await query(`SELECT value FROM settings WHERE key = 'publish'`);
  const v = rows[0]?.value || { pending: false, at: 0 };
  return { enabled: publishEnabled(), pending: Boolean(v.pending), lastAt: v.at ? new Date(Number(v.at) * 1000).toISOString() : null };
}
