/**
 * Where the API runs: Node (local, scripts, VPS) or Cloudflare Workers (worker.js).
 * On Workers, worker.js stores the bindings (ASSETS, BUCKET, HYPERDRIVE, SEND_EMAIL…) in globalThis.__CF_ENV.
 */
export const onWorkers = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';

export const cfEnv = () => globalThis.__CF_ENV || {};
