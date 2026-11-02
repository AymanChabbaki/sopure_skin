/**
 * Cloudflare Workers entry point: the whole shop (React build + Express API) in one Worker.
 * Config: wrangler.jsonc at the repository root. Local Node entry point: index.js.
 *
 * - Store pages (/fr, /en, /ar…), /api, sitemap, robots, llms, feeds and the IndexNow key → Express
 *   (pages get their SEO tags and crawler links injected server-side, as before).
 * - Everything else (JS/CSS bundles, images, favicons, /admin screens) → static assets.
 */
import { httpServerHandler } from 'cloudflare:node';
import { app } from './app.js';

const PORT = 8080;
app.listen(PORT);
const express = httpServerHandler({ port: PORT });

const TO_EXPRESS = [
  /^\/$/,
  /^\/(fr|en|ar)(\/|$)/,
  /^\/api\//,
  /^\/(sitemap\.xml|robots\.txt|llms\.txt|llms-full\.txt)$/,
  /^\/feeds\//,
  /^\/[0-9a-f]{32}\.txt$/,
];

export default {
  async fetch(request, env, ctx) {
    // Bindings (ASSETS, BUCKET, HYPERDRIVE…) for the modules that need them (lib/runtime.js)
    globalThis.__CF_ENV = env;
    const { pathname } = new URL(request.url);
    if (TO_EXPRESS.some((re) => re.test(pathname))) return express.fetch(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
};
