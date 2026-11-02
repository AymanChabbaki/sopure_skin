/**
 * So Pure Skin storefront on Cloudflare Workers.
 *
 * - Static files (JS, CSS, images) are served from the Vite build by the ASSETS binding.
 * - Store pages (/fr, /en, /ar…) get their SEO tags and crawler links from the API (/api/seo/render),
 *   merged into this build's index.html, exactly like the Express server does on Vercel.
 * - API and SEO files (/api, sitemap, robots, llms, feeds, IndexNow key) are proxied to the API, so the
 *   admin cookie stays on the shop's own domain.
 *
 * Settings (wrangler.jsonc / dashboard): API_ORIGIN (var), PROXY_SECRET (secret, same value as on the API).
 */

const BACKEND = [/^\/api\//, /^\/(sitemap\.xml|robots\.txt|llms\.txt|llms-full\.txt)$/, /^\/feeds\//, /^\/[0-9a-f]{32}\.txt$/];
const STORE_PAGE = /^\/(fr|en|ar)(\/|$)/;
const SEO_TIMEOUT_MS = 4000;

let shellCache;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/') return Response.redirect(new URL(`/fr${url.search}`, url), 302);
    if (BACKEND.some((re) => re.test(url.pathname))) return proxy(request, env, url);
    if (STORE_PAGE.test(url.pathname) && (request.method === 'GET' || request.method === 'HEAD')) {
      return renderPage(request, env, url, ctx);
    }
    // Admin and anything else: static file, or the SPA shell (not_found_handling)
    return env.ASSETS.fetch(request);
  },
};

/** Headers the API needs to see the real visitor behind the Worker. */
function forwardHeaders(request, env, url) {
  const headers = new Headers(request.headers);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) headers.set('x-client-ip', ip);
  if (env.PROXY_SECRET) headers.set('x-proxy-secret', env.PROXY_SECRET);
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', 'https');
  return headers;
}

async function proxy(request, env, url) {
  const target = new URL(url.pathname + url.search, env.API_ORIGIN);
  const res = await fetch(target, {
    method: request.method,
    headers: forwardHeaders(request, env, url),
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  });
  // Set-Cookie from the API applies to this domain (no Domain attribute), so admin login keeps working
  return new Response(res.body, res);
}

async function getShell(request, env) {
  if (!shellCache) {
    // "/" is index.html in the assets (requesting /index.html would redirect to /)
    const res = await env.ASSETS.fetch(new Request(new URL('/', request.url)));
    shellCache = await res.text();
  }
  return shellCache;
}

async function renderPage(request, env, url, ctx) {
  const shell = await getShell(request, env);
  const seoUrl = new URL('/api/seo/render', env.API_ORIGIN);
  seoUrl.searchParams.set('path', url.pathname);
  seoUrl.searchParams.set('search', url.search.slice(1));

  let html = shell;
  try {
    const res = await fetch(seoUrl, {
      headers: forwardHeaders(request, env, url),
      signal: AbortSignal.timeout(SEO_TIMEOUT_MS),
      cf: { cacheTtl: 60, cacheEverything: true },
    });
    if (res.ok) {
      const seo = await res.json();
      html = shell
        .replace(/<html[^>]*>/, `<html lang="${seo.lang}" dir="${seo.dir}">`)
        .replace(/<title>.*?<\/title>/s, '')
        .replace('<!--app-head-->', seo.head)
        .replace('<div id="root"></div>', `<div id="root">${seo.body}</div>`);
    }
  } catch (err) {
    // API slow or down: the page still works (the app loads its own data and tags)
    console.warn('SEO render failed:', err.message);
  }

  return new Response(request.method === 'HEAD' ? null : html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    },
  });
}
