import { Router } from 'express';
import { query } from './db/pool.js';
import { config, LOCALES, DEFAULT_LOCALE } from './config.js';
import { getSettings } from './lib/settings.js';
import { getProductBySlug } from './lib/catalog.js';
import { escapeHtml as esc, stripHtml, tr, truncate } from './lib/utils.js';

const SITE = config.siteUrl;
const BRAND = 'So Pure Skin';
const OG_LOCALES = { fr: 'fr_MA', en: 'en_US', ar: 'ar_MA' };

const absolute = (url) => (!url ? `${SITE}/og-image.png` : url.startsWith('http') ? url : `${SITE}${url}`);

export const seoRouter = Router();

/* --------------------------------- robots --------------------------------- */

seoRouter.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /api/',
      'Disallow: /*/cart',
      'Disallow: /*/checkout',
      '',
      '# AI assistants are welcome to read the catalog',
      'User-agent: GPTBot',
      'Allow: /',
      'User-agent: ClaudeBot',
      'Allow: /',
      'User-agent: PerplexityBot',
      'Allow: /',
      'User-agent: Google-Extended',
      'Allow: /',
      '',
      `Sitemap: ${SITE}/sitemap.xml`,
    ].join('\n'),
  );
});

/* --------------------------------- sitemap -------------------------------- */

function urlEntry(path, lastmod, priority = '0.7', images = []) {
  const alternates = LOCALES.map(
    (l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE}/${l}${path}"/>`,
  ).join('');
  const xDefault = `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/${DEFAULT_LOCALE}${path}"/>`;
  const imgs = images.map((i) => `<image:image><image:loc>${esc(absolute(i))}</image:loc></image:image>`).join('');
  return LOCALES.map(
    (l) =>
      `<url><loc>${SITE}/${l}${path}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}` +
      `<priority>${priority}</priority>${alternates}${xDefault}${imgs}</url>`,
  ).join('');
}

seoRouter.get('/sitemap.xml', async (_req, res) => {
  const [products, categories, brands] = await Promise.all([
    query(
      `SELECT p.slug, p.updated_at,
              (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1) AS image
         FROM products p WHERE p.is_active`,
    ),
    query('SELECT slug FROM categories WHERE is_visible'),
    query('SELECT slug FROM brands'),
  ]);

  const body = [
    urlEntry('', null, '1.0'),
    urlEntry('/shop', null, '0.9'),
    urlEntry('/brands', null, '0.6'),
    urlEntry('/about', null, '0.4'),
    urlEntry('/faq', null, '0.5'),
    urlEntry('/contact', null, '0.4'),
    urlEntry('/shipping', null, '0.4'),
    ...categories.rows.map((c) => urlEntry(`/category/${c.slug}`, null, '0.8')),
    ...brands.rows.map((b) => urlEntry(`/brand/${b.slug}`, null, '0.7')),
    ...products.rows.map((p) => urlEntry(`/product/${p.slug}`, p.updated_at, '0.8', p.image ? [p.image] : [])),
  ].join('');

  res
    .type('application/xml')
    .set('Cache-Control', 'public, max-age=3600')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ` +
        `xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${body}</urlset>`,
    );
});

/* ------------------------- llms.txt (GEO / AI search) ------------------------ */

seoRouter.get('/llms.txt', async (_req, res) => {
  const s = await getSettings();
  const [{ rows: products }, { rows: categories }, { rows: brands }] = await Promise.all([
    query(
      `SELECT p.slug, p.name->>'fr' AS name, p.price, b.name AS brand, p.short_description->>'fr' AS short
         FROM products p LEFT JOIN brands b ON b.id = p.brand_id WHERE p.is_active ORDER BY p.sales_count DESC`,
    ),
    query(`SELECT slug, name->>'fr' AS name FROM categories WHERE is_visible ORDER BY kind, position`),
    query('SELECT slug, name FROM brands ORDER BY name'),
  ]);

  const lines = [
    `# ${BRAND}`,
    '',
    `> ${tr(s.seo.description, 'fr')}`,
    '',
    `${BRAND} is an online shop based in ${s.contact.city}, Morocco, selling authentic Korean skincare (K-beauty).`,
    `- Payment: cash on delivery only (paiement à la livraison).`,
    `- Delivery: ${s.shipping.casablancaFee} MAD in Casablanca, ${s.shipping.otherFee} MAD in other Moroccan cities, free for more than ${s.shipping.freeAboveItems} products.`,
    `- Languages: French (/fr), English (/en), Arabic (/ar).`,
    `- Contact: ${s.contact.phone} · ${s.contact.email}`,
    '',
    '## Categories',
    ...categories.map((c) => `- [${c.name}](${SITE}/fr/category/${c.slug})`),
    '',
    '## Brands',
    ...brands.map((b) => `- [${b.name}](${SITE}/fr/brand/${b.slug})`),
    '',
    '## Products',
    ...products.map(
      (p) => `- [${p.name}](${SITE}/fr/product/${p.slug}): ${p.price} MAD${p.brand ? ` · ${p.brand}` : ''}. ${truncate(stripHtml(p.short || ''), 140)}`,
    ),
  ];
  res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(lines.join('\n'));
});

/* ------------------------- HTML head injection (SPA) ------------------------ */

const STATIC_PAGES = {
  shop: { fr: 'Boutique', en: 'Shop', ar: 'المتجر' },
  brands: { fr: 'Nos marques', en: 'Our brands', ar: 'علاماتنا التجارية' },
  about: { fr: 'À propos', en: 'About us', ar: 'من نحن' },
  faq: { fr: 'Questions fréquentes', en: 'FAQ', ar: 'الأسئلة الشائعة' },
  contact: { fr: 'Contact', en: 'Contact', ar: 'اتصل بنا' },
  shipping: { fr: 'Livraison & paiement', en: 'Shipping & payment', ar: 'التوصيل والدفع' },
};

function organizationLd(settings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: BRAND,
    url: SITE,
    logo: `${SITE}/android-chrome-512x512.png`,
    email: settings.contact.email,
    telephone: settings.contact.phone,
    address: { '@type': 'PostalAddress', addressLocality: settings.contact.city, addressCountry: 'MA' },
    areaServed: { '@type': 'Country', name: 'Morocco' },
    currenciesAccepted: 'MAD',
    paymentAccepted: 'Cash on delivery',
    sameAs: [settings.contact.instagram, settings.contact.facebook, settings.contact.tiktok].filter(Boolean),
  };
}

function breadcrumbLd(locale, crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${SITE}/${locale}${c.path}` })),
  };
}

/** Resolves page metadata + fallback HTML body for a storefront URL. */
async function resolvePage(pathname) {
  const [, maybeLocale, section, slug] = pathname.split('/');
  const locale = LOCALES.includes(maybeLocale) ? maybeLocale : DEFAULT_LOCALE;
  const rest = LOCALES.includes(maybeLocale) ? pathname.slice(maybeLocale.length + 1) : pathname;
  const settings = await getSettings();
  const home = { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' }[locale];

  const page = {
    locale,
    path: rest === '/' ? '' : rest,
    title: tr(settings.seo.title, locale),
    description: tr(settings.seo.description, locale),
    image: null,
    type: 'website',
    noindex: ['cart', 'checkout', 'order'].includes(section),
    jsonLd: [organizationLd(settings), { '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, url: SITE, inLanguage: locale }],
    body: '',
  };

  if (section === 'product' && slug) {
    const p = await getProductBySlug(decodeURIComponent(slug));
    if (p?.is_active) {
      const name = tr(p.name, locale);
      const desc = stripHtml(tr(p.meta_description, locale) || tr(p.short_description, locale) || tr(p.description, locale));
      page.title = `${tr(p.meta_title, locale) || name} | ${BRAND}`;
      page.description = truncate(desc, 160);
      page.image = p.images[0]?.url;
      page.type = 'product';
      page.price = p.price;
      // Only genuine, approved reviews feed Google's rich results (never the sample ones)
      const { rows: [real] } = await query(
        'SELECT count(*) AS count, round(avg(rating)::numeric, 1) AS avg FROM reviews WHERE product_id = $1 AND is_approved AND NOT is_sample',
        [p.id],
      );
      page.jsonLd.push(
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name,
          description: truncate(stripHtml(tr(p.description, locale) || desc), 5000),
          image: p.images.map((i) => absolute(i.url)),
          sku: p.sku || String(p.id),
          brand: p.brand_name ? { '@type': 'Brand', name: p.brand_name } : undefined,
          category: p.categories.map((c) => tr(c.name, locale)).join(', ') || undefined,
          aggregateRating: real.count > 0 ? { '@type': 'AggregateRating', ratingValue: real.avg, reviewCount: real.count } : undefined,
          offers: {
            '@type': 'Offer',
            url: `${SITE}/${locale}/product/${p.slug}`,
            priceCurrency: 'MAD',
            price: p.price,
            availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: BRAND },
            shippingDetails: {
              '@type': 'OfferShippingDetails',
              shippingRate: { '@type': 'MonetaryAmount', value: settings.shipping.otherFee, currency: 'MAD' },
              shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'MA' },
            },
          },
        },
        breadcrumbLd(locale, [
          { name: home, path: '' },
          { name: STATIC_PAGES.shop[locale], path: '/shop' },
          { name, path: `/product/${p.slug}` },
        ]),
      );
      page.body =
        `<article><h1>${esc(name)}</h1>${p.brand_name ? `<p>${esc(p.brand_name)}</p>` : ''}` +
        `<p>${p.price} MAD</p><p>${esc(stripHtml(tr(p.description, locale)))}</p></article>`;
    } else {
      page.noindex = true;
    }
  } else if ((section === 'category' || section === 'brand') && slug) {
    const table = section === 'category' ? 'categories' : 'brands';
    const { rows: [row] } = await query(`SELECT * FROM ${table} WHERE slug = $1`, [slug]);
    if (row) {
      const name = section === 'category' ? tr(row.name, locale) : row.name;
      const { rows: items } = await query(
        `SELECT p.slug, p.name, p.price FROM products p
          WHERE p.is_active AND ${section === 'category'
            ? 'EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = $1)'
            : 'p.brand_id = $1'}
          ORDER BY p.sales_count DESC LIMIT 60`,
        [row.id],
      );
      const lead = { fr: 'Découvrez notre sélection', en: 'Discover our selection', ar: 'اكتشفي تشكيلتنا' }[locale];
      page.title = `${name} | ${BRAND}`;
      page.description = truncate(stripHtml(tr(row.description, locale)) || `${lead} ${name} - ${tr(settings.seo.description, locale)}`, 160);
      page.jsonLd.push(
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name,
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/${locale}/product/${p.slug}` })),
          },
        },
        breadcrumbLd(locale, [{ name: home, path: '' }, { name, path: `/${section}/${slug}` }]),
      );
      page.body =
        `<h1>${esc(name)}</h1><ul>` +
        items.map((p) => `<li><a href="/${locale}/product/${p.slug}">${esc(tr(p.name, locale))}</a> - ${p.price} MAD</li>`).join('') +
        '</ul>';
    } else {
      page.noindex = true;
    }
  } else if (STATIC_PAGES[section]) {
    page.title = `${STATIC_PAGES[section][locale]} | ${BRAND}`;
    if (section === 'shipping' || section === 'faq') {
      page.description = {
        fr: `Paiement à la livraison partout au Maroc. Livraison ${settings.shipping.casablancaFee} DH à Casablanca, ${settings.shipping.otherFee} DH autres villes, gratuite dès ${settings.shipping.freeAboveItems + 1} produits.`,
        en: `Cash on delivery across Morocco. Delivery ${settings.shipping.casablancaFee} MAD in Casablanca, ${settings.shipping.otherFee} MAD elsewhere, free from ${settings.shipping.freeAboveItems + 1} products.`,
        ar: `الدفع عند الاستلام في جميع أنحاء المغرب. التوصيل ${settings.shipping.casablancaFee} درهم في الدار البيضاء و${settings.shipping.otherFee} درهم لباقي المدن، ومجاني ابتداءً من ${settings.shipping.freeAboveItems + 1} منتجات.`,
      }[locale];
    }
  }

  return page;
}

function renderHead(page) {
  const url = `${SITE}/${page.locale}${page.path}`;
  const image = absolute(page.image);
  const tags = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}">`,
    `<link rel="canonical" href="${url}">`,
    page.noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large">',
    ...LOCALES.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}/${l}${page.path}">`),
    `<link rel="alternate" hreflang="x-default" href="${SITE}/${DEFAULT_LOCALE}${page.path}">`,
    `<meta property="og:site_name" content="${BRAND}">`,
    `<meta property="og:type" content="${page.type}">`,
    `<meta property="og:title" content="${esc(page.title)}">`,
    `<meta property="og:description" content="${esc(page.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:locale" content="${OG_LOCALES[page.locale]}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(page.title)}">`,
    `<meta name="twitter:description" content="${esc(page.description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    page.price ? `<meta property="product:price:amount" content="${page.price}">` : '',
    page.price ? '<meta property="product:price:currency" content="MAD">' : '',
    ...page.jsonLd.map((ld) => `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`),
  ];
  // data-ssr lets the client remove these once React takes over the <head>
  return tags.filter(Boolean).map((t) => t.replace(/^<(\w+)/, '<$1 data-ssr')).join('\n    ');
}

/** Returns the SPA shell with SEO tags and crawler-readable content injected. */
export async function renderIndex(template, pathname) {
  let page;
  try {
    page = await resolvePage(pathname);
  } catch (err) {
    console.error('SEO resolve failed', err);
    return template;
  }
  return template
    .replace(/<html[^>]*>/, `<html lang="${page.locale}" dir="${page.locale === 'ar' ? 'rtl' : 'ltr'}">`)
    .replace(/<title>.*?<\/title>/s, '')
    .replace('<!--app-head-->', renderHead(page))
    .replace('<div id="root"></div>', `<div id="root">${page.body}</div>`);
}
