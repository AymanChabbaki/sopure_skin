/**
 * CDN cache lifetimes (CDN-Cache-Control: read by Vercel's edge, ignored by browsers, which always revalidate).
 * Every cache miss runs the server function, so these keep CPU usage within the Vercel plan:
 * crawlers visit hundreds of URLs once each, which only the edge cache can absorb.
 * stale-while-revalidate: the edge answers instantly with its copy and refreshes it in the background.
 */
// Storefront pages: a price or stock change shows within 10 minutes
export const CDN_PAGE = 'public, s-maxage=600, stale-while-revalidate=86400';
// Storefront API (products, settings, categories…)
export const CDN_API = 'public, s-maxage=300, stale-while-revalidate=86400';
// Large generated files (sitemap, Merchant feed, llms.txt, robots.txt): rebuilt a few times a day
export const CDN_FILE = 'public, s-maxage=21600, stale-while-revalidate=86400';
