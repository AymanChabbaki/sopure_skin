/**
 * Static API snapshots: at each build, server/scripts/prerender.mjs saves the public GET answers the storefront
 * needs (settings, catalog, product pages, reviews, SEO…) as JSON files under /data. The browser reads those static
 * files first: they are served by the CDN for free and never run the Worker. Anything not snapshotted (search,
 * filters, later pages) falls back to the live /api. Orders always go to /api, which re-checks prices and stock.
 * Shared by the client (lib/api.js) and the build script, so both compute the same file name.
 */
export const SNAPSHOT_PREFIXES = ['/settings', '/categories', '/brands', '/articles', '/videos', '/chat/status', '/products', '/packs', '/seo'];

export const isSnapshotted = (path, searchParams) =>
  SNAPSHOT_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`)) &&
  !['q', 'minPrice', 'maxPrice'].some((k) => searchParams.has(k));

/** /products + ?sort=new&lang=fr  ->  /data/products@lang~3Dfr~26sort~3Dnew.json */
export function staticDataPath(path, searchParams) {
  const qs = [...searchParams]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `/data${path}${qs ? `@${encodeURIComponent(qs).replace(/%/g, '~')}` : ''}.json`;
}
