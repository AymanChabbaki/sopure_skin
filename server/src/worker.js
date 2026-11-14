/**
 * Cloudflare Workers entry point. Config: wrangler.jsonc at the repository root. Local Node entry point: index.js.
 *
 * Shop pages, sitemap, robots, feeds… are static files pre-rendered at build time and served by the assets layer
 * without running this Worker (run_worker_first: /api/* only). This Worker only runs the Express API.
 * Public GET responses (those sending CDN-Cache-Control, see lib/cache.js) are kept in the edge cache, so
 * repeated catalog requests cost no CPU and no database query.
 */
import { httpServerHandler } from 'cloudflare:node';
import { app } from './app.js';

const PORT = 8080;
app.listen(PORT);
const express = httpServerHandler({ port: PORT });

const isCacheable = (request, url) =>
  request.method === 'GET' &&
  !url.pathname.startsWith('/api/admin') &&
  !request.headers.has('authorization');

export default {
  async fetch(request, env, ctx) {
    // Bindings (ASSETS, BUCKET, HYPERDRIVE…) for the modules that need them (lib/runtime.js)
    globalThis.__CF_ENV = env;
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (!isCacheable(request, url)) return express.fetch(request, env, ctx);

    const cache = caches.default;
    const hit = await cache.match(request);
    if (hit) {
      const out = new Response(hit.body, hit);
      out.headers.set('Cache-Control', hit.headers.get('X-Browser-Cache-Control') || 'no-cache');
      out.headers.delete('X-Browser-Cache-Control');
      return out;
    }

    const res = await express.fetch(request, env, ctx);
    const maxAge = res.headers.get('CDN-Cache-Control')?.match(/s-maxage=(\d+)/)?.[1];
    if (res.status === 200 && maxAge && !res.headers.has('set-cookie')) {
      // The edge copy expires after s-maxage; the browser keeps the API's own Cache-Control
      const stored = new Response(res.clone().body, res);
      stored.headers.set('X-Browser-Cache-Control', res.headers.get('Cache-Control') || 'no-cache');
      stored.headers.set('Cache-Control', `public, max-age=${maxAge}`);
      ctx.waitUntil(
        cache.put(request, stored).catch(() => null),
      );
    }
    return res;
  },
};
