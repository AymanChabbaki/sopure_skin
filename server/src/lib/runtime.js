/**
 * Where the API runs: Node (local, scripts, VPS) or Cloudflare Workers (worker.js).
 * On Workers, worker.js stores the bindings (ASSETS, BUCKET, HYPERDRIVE, SEND_EMAIL…) in globalThis.__CF_ENV.
 */
export const onWorkers = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';

export const cfEnv = () => globalThis.__CF_ENV || {};

/**
 * Keeps the Worker alive until `promise` settles. Cloudflare stops a request's pending work once its response is
 * sent, so anything done after the response (rebuild request, IndexNow…) must be registered here. No-op on Node.
 */
const cfWorkers = onWorkers ? await import('cloudflare:workers') : null;
export const keepAlive = (promise) => {
  cfWorkers?.waitUntil?.(promise);
  return promise;
};
