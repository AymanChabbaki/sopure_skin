import { Router } from 'express';
import { query } from './db/pool.js';
import { config, LOCALES, DEFAULT_LOCALE, r2Enabled } from './config.js';
import { getSettings } from './lib/settings.js';
import { getProductBySlug, relatedProducts } from './lib/catalog.js';
import { indexNowKey } from './lib/indexnow.js';
import { escapeHtml as esc, stripHtml, tr, truncate } from './lib/utils.js';

const SITE = config.siteUrl;
const BRAND = 'So Pure Skin';
const OG_LOCALES = { fr: 'fr_MA', en: 'en_US', ar: 'ar_MA' };
const ORG_ID = `${SITE}/#organization`;
const SITE_ID = `${SITE}/#website`;
const DEFAULT_OG_IMAGE = '/hero/hero-1.webp';

const absolute = (url) => (!url ? `${SITE}${DEFAULT_OG_IMAGE}` : url.startsWith('http') ? url : `${SITE}${url}`);
const LD = (data) => ({ '@context': 'https://schema.org', ...data });

const T = {
  home: { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' },
  shop: { fr: 'Boutique', en: 'Shop', ar: 'المتجر' },
  priceIn: { fr: (p) => `${p} DH au Maroc`, en: (p) => `${p} MAD in Morocco`, ar: (p) => `${p} درهم في المغرب` },
  categorySuffix: { fr: 'K-beauty au Maroc', en: 'Korean skincare in Morocco', ar: 'منتجات كورية في المغرب' },
  brandSuffix: { fr: (b) => `${b} Maroc – Produits originaux`, en: (b) => `${b} Morocco – Authentic products`, ar: (b) => `${b} المغرب – منتجات أصلية` },
  deliveryPitch: {
    fr: 'Livraison partout au Maroc, paiement à la livraison.',
    en: 'Delivery everywhere in Morocco, cash on delivery.',
    ar: 'التوصيل لجميع مدن المغرب والدفع عند الاستلام.',
  },
  photo: { fr: 'photo', en: 'photo', ar: 'صورة' },
};

const STATIC_PAGES = {
  shop: { fr: 'Boutique de cosmétiques coréens au Maroc', en: 'Korean skincare shop in Morocco', ar: 'متجر مستحضرات التجميل الكورية في المغرب' },
  brands: { fr: 'Marques coréennes', en: 'Korean brands', ar: 'العلامات الكورية' },
  about: { fr: 'À propos', en: 'About us', ar: 'من نحن' },
  faq: { fr: 'Questions fréquentes', en: 'FAQ', ar: 'الأسئلة الشائعة' },
  contact: { fr: 'Contact', en: 'Contact', ar: 'اتصل بنا' },
  shipping: { fr: 'Livraison & paiement', en: 'Shipping & payment', ar: 'التوصيل والدفع' },
  policies: { fr: 'Conditions de vente, retours & confidentialité', en: 'Terms of sale, returns & privacy', ar: 'شروط البيع والإرجاع والخصوصية' },
  routine: { fr: 'Composer ma routine de soin coréenne', en: 'Build my Korean skincare routine', ar: 'كوّني روتين العناية الكوري الخاص بك' },
};
// Private or transactional pages: never indexed
const NOINDEX_PAGES = {
  cart: { fr: 'Panier', en: 'Cart', ar: 'السلة' },
  checkout: { fr: 'Commande', en: 'Checkout', ar: 'إتمام الطلب' },
  order: { fr: 'Commande confirmée', en: 'Order confirmed', ar: 'تم تأكيد الطلب' },
  wishlist: { fr: 'Favoris', en: 'Wishlist', ar: 'المفضلة' },
};

/* --------------------------- Structured data blocks -------------------------- */

const days = (min, max) => ({ '@type': 'QuantitativeValue', minValue: min, maxValue: max, unitCode: 'DAY' });

/** Offer-level shipping (Google reads it for merchant listings). Morocco has no region support, so the higher rate is declared. */
function offerShipping(settings) {
  const s = settings.shipping;
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: s.otherFee, currency: 'MAD' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'MA' },
    deliveryTime: { '@type': 'ShippingDeliveryTime', handlingTime: days(0, 1), transitTime: days(1, 4) },
  };
}

/** Site-wide shipping policy (Organization > hasShippingService, Google Nov. 2025). Free above N items. */
function shippingService(settings) {
  const s = settings.shipping;
  const transit = { '@type': 'ServicePeriod', duration: days(1, 4), businessDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
  return {
    '@type': 'ShippingService',
    '@id': `${SITE}/#shipping`,
    name: 'Livraison Maroc / Delivery Morocco',
    description: `Casablanca ${s.casablancaFee} MAD, other cities ${s.otherFee} MAD, free for more than ${s.freeAboveItems} products. Cash on delivery.`,
    fulfillmentType: 'FulfillmentTypeDelivery',
    handlingTime: { '@type': 'ServicePeriod', duration: days(0, 1) },
    shippingConditions: [
      {
        '@type': 'ShippingConditions',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'MA' },
        numItems: { '@type': 'QuantitativeValue', minValue: 1, maxValue: s.freeAboveItems },
        shippingRate: { '@type': 'MonetaryAmount', value: s.otherFee, currency: 'MAD' },
        transitTime: transit,
      },
      {
        '@type': 'ShippingConditions',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'MA' },
        numItems: { '@type': 'QuantitativeValue', minValue: s.freeAboveItems + 1 },
        shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'MAD' },
        transitTime: transit,
      },
    ],
  };
}

/** Return policy: only published once the shop has configured one (never invented). */
function returnPolicy(settings) {
  const r = settings.returns;
  if (!r?.enabled) return undefined;
  return {
    '@type': 'MerchantReturnPolicy',
    '@id': `${SITE}/#returns`,
    applicableCountry: 'MA',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: r.days,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: r.fees === 'free' ? 'https://schema.org/FreeReturn' : 'https://schema.org/ReturnFeesCustomerResponsibility',
  };
}

function organizationLd(settings) {
  const c = settings.contact;
  return LD({
    '@type': 'OnlineStore',
    '@id': ORG_ID,
    name: BRAND,
    url: SITE,
    slogan: 'Filter Insta kimshi, walakin skin care kib9a',
    logo: { '@type': 'ImageObject', url: `${SITE}/android-chrome-512x512.png`, width: 512, height: 512 },
    image: absolute(DEFAULT_OG_IMAGE),
    email: c.email,
    telephone: c.phone,
    address: { '@type': 'PostalAddress', addressLocality: c.city, addressCountry: 'MA' },
    areaServed: { '@type': 'Country', name: 'Morocco', identifier: 'MA' },
    currenciesAccepted: 'MAD',
    paymentAccepted: 'Cash on delivery',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: c.phone,
      email: c.email,
      contactType: 'customer service',
      areaServed: 'MA',
      availableLanguage: ['French', 'Arabic', 'English'],
    },
    sameAs: [c.instagram, c.facebook, c.tiktok, c.whatsapp && `https://wa.me/${c.whatsapp}`].filter(Boolean),
    hasShippingService: shippingService(settings),
    hasMerchantReturnPolicy: returnPolicy(settings),
  });
}

const websiteLd = (locale) =>
  LD({ '@type': 'WebSite', '@id': SITE_ID, name: BRAND, url: SITE, inLanguage: locale, publisher: { '@id': ORG_ID } });

const breadcrumbLd = (locale, crumbs) =>
  LD({
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${SITE}/${locale}${c.path}` })),
  });

/** Approved reviews written by real customers (sample reviews never reach Google). */
async function realRating(productId) {
  const { rows: [r] } = await query(
    'SELECT count(*) AS count, round(avg(rating)::numeric, 1) AS avg FROM reviews WHERE product_id = $1 AND is_approved AND NOT is_sample',
    [productId],
  );
  return r.count > 0 ? { '@type': 'AggregateRating', ratingValue: r.avg, reviewCount: r.count, bestRating: 5, worstRating: 1 } : undefined;
}

/* ------------------------------- Page builder ------------------------------- */

/* ------------------------------ Crawler links ------------------------------ */

const NAV_LABELS = {
  categories: { fr: 'Catégories', en: 'Categories', ar: 'الفئات' },
  routines: { fr: 'Routines', en: 'Routines', ar: 'الروتينات' },
  brands: { fr: 'Marques', en: 'Brands', ar: 'العلامات' },
  related: { fr: 'Vous aimerez aussi', en: 'You may also like', ar: 'قد يعجبك أيضاً' },
};
let navCache = { at: 0, data: null };

/** Every hub page (categories, routines, brands, info pages), cached 5 minutes. */
async function hubs() {
  if (navCache.data && Date.now() - navCache.at < 300_000) return navCache.data;
  const [{ rows: categories }, { rows: brands }] = await Promise.all([
    query('SELECT slug, kind, name FROM categories WHERE is_visible ORDER BY kind, position'),
    query('SELECT b.slug, b.name FROM brands b WHERE EXISTS (SELECT 1 FROM products p WHERE p.brand_id = b.id AND p.is_active) ORDER BY b.name'),
  ]);
  navCache = { at: Date.now(), data: { categories, brands } };
  return navCache.data;
}

const productLinks = (items, locale) =>
  items
    .map((p) => {
      const name = tr(p.name, locale);
      return `<li><a href="/${locale}/product/${p.slug}"><img src="${esc(absolute(p.image))}" alt="${esc(`${name}${p.brand ? ` – ${p.brand}` : ''}`)}" width="480" height="600" loading="lazy">${esc(name)}</a> – ${p.price} MAD</li>`;
    })
    .join('');

/**
 * Plain links to every hub page, appended to each crawler body: Google discovers and revisits pages
 * by following links, so every product is at most two clicks from any page (React replaces this on load).
 */
async function crawlerNav(locale) {
  const { categories, brands } = await hubs();
  const link = (path, label) => `<li><a href="/${locale}${path}">${esc(label)}</a></li>`;
  const list = (title, items) => `<h2>${esc(title)}</h2><ul>${items.join('')}</ul>`;
  return (
    '<nav>' +
    `<ul>${link('', T.home[locale])}${link('/shop', T.shop[locale])}${Object.keys(STATIC_PAGES).filter((k) => k !== 'shop').map((k) => link(`/${k}`, STATIC_PAGES[k][locale])).join('')}</ul>` +
    list(NAV_LABELS.categories[locale], categories.filter((c) => c.kind === 'type').map((c) => link(`/category/${c.slug}`, tr(c.name, locale)))) +
    list(NAV_LABELS.routines[locale], categories.filter((c) => c.kind === 'routine').map((c) => link(`/category/${c.slug}`, tr(c.name, locale)))) +
    list(NAV_LABELS.brands[locale], brands.map((b) => link(`/brand/${b.slug}`, b.name))) +
    '</nav>'
  );
}

const PRODUCT_CARD_SQL = `SELECT p.slug, p.name, p.price, b.name AS brand,
       (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1) AS image
  FROM products p LEFT JOIN brands b ON b.id = p.brand_id`;

/**
 * Everything search engines need for a storefront URL: title, description, canonical data,
 * JSON-LD and a crawler-readable HTML body (with real <img> tags for Google Images).
 */
export async function buildPage(pathname, search = '') {
  const [, maybeLocale, section, slug] = pathname.split('/');
  const locale = LOCALES.includes(maybeLocale) ? maybeLocale : DEFAULT_LOCALE;
  const rest = LOCALES.includes(maybeLocale) ? pathname.slice(maybeLocale.length + 1) : pathname;
  const settings = await getSettings();
  const params = new URLSearchParams(search);

  const page = {
    locale,
    path: rest === '/' ? '' : rest.replace(/\/$/, ''),
    title: tr(settings.seo.title, locale),
    description: tr(settings.seo.description, locale),
    image: null,
    imageAlt: BRAND,
    type: 'website',
    noindex: false,
    price: null,
    preloadImage: null,
    jsonLd: [organizationLd(settings), websiteLd(locale)],
    body: '',
  };

  if (!section) {
    // Home: hero is the LCP element and the sharing image
    const hero = settings.hero?.find((h) => h.image);
    page.image = hero?.image || DEFAULT_OG_IMAGE;
    page.imageAlt = tr(hero?.title, locale) || BRAND;
    page.preloadImage = hero ? { src: hero.image, srcSm: hero.imageSm || hero.image } : null;
    const { rows: top } = await query(
      `SELECT p.slug, p.name, p.price, b.name AS brand,
              (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1) AS image
         FROM products p LEFT JOIN brands b ON b.id = p.brand_id
        WHERE p.is_active ORDER BY p.sales_count DESC LIMIT 48`,
    );
    page.body = `<h1>${esc(page.title)}</h1><p>${esc(page.description)}</p><ul>${productLinks(top, locale)}</ul>`;
  } else if (section === 'product' && slug) {
    const p = await getProductBySlug(decodeURIComponent(slug));
    if (!p?.is_active) {
      page.noindex = true;
      return page;
    }
    const name = tr(p.name, locale);
    const url = `${SITE}/${locale}/product/${p.slug}`;
    const short = stripHtml(tr(p.meta_description, locale) || tr(p.short_description, locale) || tr(p.description, locale));
    page.title = `${tr(p.meta_title, locale) || `${name} – ${T.priceIn[locale](p.price)}`} | ${BRAND}`;
    // Summary sized so the delivery line always fits in Google's ~160 characters
    const pitch = T.deliveryPitch[locale];
    page.description = `${truncate(short, 158 - pitch.length)} ${pitch}`;
    page.image = p.images[0]?.url;
    page.imageAlt = `${name}${p.brand_name ? ` – ${p.brand_name}` : ''}`;
    page.type = 'product';
    page.price = p.price;
    page.preloadImage = p.images[0] ? { src: p.images[0].url, srcSm: p.images[0].url } : null;
    const typeCategory = p.categories.find((c) => c.kind === 'type');

    page.jsonLd.push(
      LD({
        '@type': 'Product',
        '@id': `${url}#product`,
        name,
        description: truncate(stripHtml(tr(p.description, locale) || short), 5000),
        url,
        image: p.images.map((i) => absolute(i.url)),
        sku: p.sku || String(p.id),
        brand: p.brand_name ? { '@type': 'Brand', name: p.brand_name } : undefined,
        category: typeCategory ? tr(typeCategory.name, locale) : undefined,
        aggregateRating: await realRating(p.id),
        offers: {
          '@type': 'Offer',
          url,
          priceCurrency: 'MAD',
          price: p.price,
          availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@id': ORG_ID },
          shippingDetails: offerShipping(settings),
          hasMerchantReturnPolicy: returnPolicy(settings) ? { '@id': `${SITE}/#returns` } : undefined,
        },
      }),
      breadcrumbLd(locale, [
        { name: T.home[locale], path: '' },
        typeCategory ? { name: tr(typeCategory.name, locale), path: `/category/${typeCategory.slug}` } : { name: T.shop[locale], path: '/shop' },
        { name, path: `/product/${p.slug}` },
      ]),
    );
    page.body =
      `<article><h1>${esc(name)}</h1>${p.brand_name ? `<p>${esc(p.brand_name)}</p>` : ''}` +
      p.images
        .map(
          (img, i) =>
            `<img src="${esc(absolute(img.url))}" alt="${esc(i === 0 ? page.imageAlt : `${name} – ${T.photo[locale]} ${i + 1}`)}" width="1200" height="1200"${i ? ' loading="lazy"' : ''}>`,
        )
        .join('') +
      `<p>${p.price} MAD</p><p>${esc(stripHtml(tr(p.description, locale)))}</p>` +
      // Breadcrumb, brand and related products as real links
      `<p><a href="/${locale}">${esc(T.home[locale])}</a> › ` +
      (typeCategory ? `<a href="/${locale}/category/${typeCategory.slug}">${esc(tr(typeCategory.name, locale))}</a>` : `<a href="/${locale}/shop">${esc(T.shop[locale])}</a>`) +
      (p.brand_slug ? ` · <a href="/${locale}/brand/${p.brand_slug}">${esc(p.brand_name)}</a>` : '') +
      '</p></article>';
    const related = await relatedProducts(p, 8);
    if (related.length) {
      const items = related.map((r) => ({ slug: r.slug, name: r.name, price: r.price, brand: r.brand_name, image: r.images?.[0]?.url }));
      page.body += `<h2>${esc(NAV_LABELS.related[locale])}</h2><ul>${productLinks(items, locale)}</ul>`;
    }
  } else if ((section === 'category' || section === 'brand') && slug) {
    const isCategory = section === 'category';
    const { rows: [row] } = await query(`SELECT * FROM ${isCategory ? 'categories' : 'brands'} WHERE slug = $1`, [slug]);
    if (!row) {
      page.noindex = true;
      return page;
    }
    const name = isCategory ? tr(row.name, locale) : row.name;
    const { rows: items } = await query(
      `SELECT p.slug, p.name, p.price, b.name AS brand,
              (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1) AS image
         FROM products p LEFT JOIN brands b ON b.id = p.brand_id
        WHERE p.is_active AND ${isCategory
          ? 'EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = $1)'
          : 'p.brand_id = $1'}
        ORDER BY p.sales_count DESC LIMIT 200`,
      [row.id],
    );
    const intro = stripHtml(tr(row.description, locale));
    page.title = `${isCategory ? `${name} – ${T.categorySuffix[locale]}` : T.brandSuffix[locale](name)} | ${BRAND}`;
    page.description = truncate(intro || `${name} – ${T.deliveryPitch[locale]}`, 160);
    page.image = row.image_url || row.logo_url || items[0]?.image;
    page.imageAlt = name;
    const pageUrl = `${SITE}/${locale}/${section}/${slug}`;
    page.jsonLd.push(
      LD({
        '@type': 'CollectionPage',
        '@id': pageUrl,
        name,
        description: intro || undefined,
        url: pageUrl,
        isPartOf: { '@id': SITE_ID },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: items.length,
          itemListElement: items.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE}/${locale}/product/${p.slug}`,
            name: tr(p.name, locale),
            image: p.image ? absolute(p.image) : undefined,
          })),
        },
      }),
      breadcrumbLd(locale, [
        { name: T.home[locale], path: '' },
        { name: T.shop[locale], path: '/shop' },
        { name, path: `/${section}/${slug}` },
      ]),
    );
    page.body = `<h1>${esc(name)}</h1>${intro ? `<p>${esc(intro)}</p>` : ''}<ul>${productLinks(items, locale)}</ul>`;
  } else if (STATIC_PAGES[section]) {
    page.title = `${STATIC_PAGES[section][locale]} | ${BRAND}`;
    if (section === 'shop') {
      // The shop lists the whole catalog for crawlers
      const { rows: all } = await query(`${PRODUCT_CARD_SQL} WHERE p.is_active ORDER BY p.sales_count DESC`);
      page.body = `<h1>${esc(STATIC_PAGES.shop[locale])}</h1><ul>${productLinks(all, locale)}</ul>`;
    }
    // Internal search results and filtered listings are not landing pages
    if (section === 'shop' && params.get('q')) page.noindex = true;
    if (section === 'policies') {
      page.description = {
        fr: `Conditions générales de vente, droit de retour de ${settings.returns?.days ?? 7} jours et politique de confidentialité de So Pure Skin. Paiement à la livraison partout au Maroc.`,
        en: `So Pure Skin terms of sale, ${settings.returns?.days ?? 7}-day right of return and privacy policy. Cash on delivery across Morocco.`,
        ar: `الشروط العامة للبيع، حق الإرجاع خلال ${settings.returns?.days ?? 7} أيام وسياسة الخصوصية لدى So Pure Skin. الدفع عند الاستلام في جميع أنحاء المغرب.`,
      }[locale];
    }
    if (section === 'routine') {
      page.description = {
        fr: 'Diagnostic de peau gratuit : indiquez votre type de peau et votre préoccupation (acné, taches, rougeurs, points noirs) et découvrez la routine coréenne adaptée.',
        en: 'Free skin diagnosis: tell us your skin type and concern (acne, dark spots, redness, blackheads) and discover the right Korean routine.',
        ar: 'تشخيص مجاني للبشرة: اختاري نوع بشرتك ومشكلتك (حب الشباب، البقع، الاحمرار، الرؤوس السوداء) واكتشفي الروتين الكوري المناسب.',
      }[locale];
    }
    if (section === 'shipping' || section === 'faq') {
      const s = settings.shipping;
      page.description = {
        fr: `Paiement à la livraison partout au Maroc. Livraison ${s.casablancaFee} DH à Casablanca, ${s.otherFee} DH autres villes, gratuite pour plus de ${s.freeAboveItems} produits.`,
        en: `Cash on delivery across Morocco. Delivery ${s.casablancaFee} MAD in Casablanca, ${s.otherFee} MAD elsewhere, free for more than ${s.freeAboveItems} products.`,
        ar: `الدفع عند الاستلام في جميع أنحاء المغرب. التوصيل ${s.casablancaFee} درهم في الدار البيضاء و${s.otherFee} درهم لباقي المدن، ومجاني عند شراء أكثر من ${s.freeAboveItems} منتجات.`,
      }[locale];
    }
  } else if (NOINDEX_PAGES[section]) {
    page.title = `${NOINDEX_PAGES[section][locale]} | ${BRAND}`;
    page.noindex = true;
  } else {
    page.noindex = true;
  }
  if (!page.noindex) page.body += await crawlerNav(locale);
  return page;
}

/* ------------------------------ Head rendering ------------------------------ */

/**
 * Head tags as plain descriptors, shared by the server (HTML string) and the client (React elements),
 * so both always emit exactly the same metadata.
 */
export function headDescriptors(page) {
  const url = `${SITE}/${page.locale}${page.path}`;
  const image = absolute(page.image);
  const tags = [
    { tag: 'title', text: page.title },
    { tag: 'meta', attrs: { name: 'description', content: page.description } },
    { tag: 'link', attrs: { rel: 'canonical', href: url } },
    { tag: 'meta', attrs: { name: 'robots', content: page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1' } },
    ...LOCALES.map((l) => ({ tag: 'link', attrs: { rel: 'alternate', hreflang: l, href: `${SITE}/${l}${page.path}` } })),
    { tag: 'link', attrs: { rel: 'alternate', hreflang: 'x-default', href: `${SITE}/${DEFAULT_LOCALE}${page.path}` } },
    { tag: 'meta', attrs: { property: 'og:site_name', content: BRAND } },
    { tag: 'meta', attrs: { property: 'og:type', content: page.type } },
    { tag: 'meta', attrs: { property: 'og:title', content: page.title } },
    { tag: 'meta', attrs: { property: 'og:description', content: page.description } },
    { tag: 'meta', attrs: { property: 'og:url', content: url } },
    { tag: 'meta', attrs: { property: 'og:image', content: image } },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: page.imageAlt } },
    { tag: 'meta', attrs: { property: 'og:locale', content: OG_LOCALES[page.locale] } },
    ...LOCALES.filter((l) => l !== page.locale).map((l) => ({ tag: 'meta', attrs: { property: 'og:locale:alternate', content: OG_LOCALES[l] } })),
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
    { tag: 'meta', attrs: { name: 'twitter:title', content: page.title } },
    { tag: 'meta', attrs: { name: 'twitter:description', content: page.description } },
    { tag: 'meta', attrs: { name: 'twitter:image', content: image } },
  ];
  if (page.price) {
    tags.push(
      { tag: 'meta', attrs: { property: 'product:price:amount', content: String(page.price) } },
      { tag: 'meta', attrs: { property: 'product:price:currency', content: 'MAD' } },
    );
  }
  page.jsonLd.forEach((ld) => tags.push({ tag: 'script', attrs: { type: 'application/ld+json' }, text: JSON.stringify(ld) }));
  return tags;
}

const attrString = (attrs = {}) =>
  Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join('');

function renderHead(page) {
  const verification = [
    process.env.GOOGLE_SITE_VERIFICATION && `<meta name="google-site-verification" content="${esc(process.env.GOOGLE_SITE_VERIFICATION)}">`,
    process.env.BING_SITE_VERIFICATION && `<meta name="msvalidate.01" content="${esc(process.env.BING_SITE_VERIFICATION)}">`,
  ].filter(Boolean);
  // Faster LCP: open the image CDN connection early and preload the main image
  const perf = [
    r2Enabled && `<link rel="preconnect" href="${esc(config.r2.publicUrl)}" crossorigin>`,
    page.preloadImage &&
      `<link rel="preload" as="image" href="${esc(absolute(page.preloadImage.src))}" imagesrcset="${esc(absolute(page.preloadImage.srcSm))} 960w, ${esc(absolute(page.preloadImage.src))} 1920w" imagesizes="100vw" fetchpriority="high">`,
  ].filter(Boolean);
  const tags = headDescriptors(page).map((d) => {
    if (d.tag === 'script') return `<script${attrString(d.attrs)}>${d.text.replace(/</g, '\\u003c')}</script>`;
    if (d.tag === 'title') return `<title>${esc(d.text)}</title>`;
    return `<${d.tag}${attrString(d.attrs)}>`;
  });
  // data-ssr marks the tags React replaces when the visitor navigates to another page
  return [...verification, ...perf, ...tags.map((t) => t.replace(/^<(\w+)/, '<$1 data-ssr'))].join('\n    ');
}

/** Returns the SPA shell with SEO tags and crawler-readable content injected. */
export async function renderIndex(template, pathname, search = '') {
  let page;
  try {
    page = await buildPage(pathname, search);
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

/* ------------------------------- SEO routes -------------------------------- */

export const seoRouter = Router();

/** Client-side navigation asks the server for the exact same metadata. */
seoRouter.get('/api/seo', async (req, res) => {
  const path = String(req.query.path || '/').slice(0, 300);
  const page = await buildPage(path, String(req.query.search || ''));
  res.set('Cache-Control', 'no-cache').set('CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  res.json({ locale: page.locale, tags: headDescriptors(page) });
});

seoRouter.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /api/',
      'Disallow: /*/cart',
      'Disallow: /*/checkout',
      'Disallow: /*/order/',
      'Disallow: /*/wishlist',
      'Disallow: /*?q=',
      '',
      '# Search engines and AI assistants are welcome to read the catalog',
      ...['Googlebot', 'Googlebot-Image', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'].flatMap(
        (ua) => [`User-agent: ${ua}`, 'Allow: /', 'Disallow: /admin', 'Disallow: /api/', ''],
      ),
      `Sitemap: ${SITE}/sitemap.xml`,
    ].join('\n'),
  );
});

function urlEntry(path, lastmod, images = []) {
  const alternates = LOCALES.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE}/${l}${path}"/>`).join('');
  const xDefault = `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/${DEFAULT_LOCALE}${path}"/>`;
  const imgs = images.map((i) => `<image:image><image:loc>${esc(absolute(i))}</image:loc></image:image>`).join('');
  return LOCALES.map(
    (l) =>
      `<url><loc>${SITE}/${l}${path}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}` +
      `${alternates}${xDefault}${imgs}</url>`,
  ).join('');
}

seoRouter.get('/sitemap.xml', async (_req, res) => {
  const [products, categories, brands, settings] = await Promise.all([
    query(
      `SELECT p.slug, p.updated_at,
              coalesce((SELECT json_agg(url ORDER BY position) FROM product_images WHERE product_id = p.id), '[]') AS images
         FROM products p WHERE p.is_active ORDER BY p.sales_count DESC`,
    ),
    query(`SELECT c.slug, (SELECT max(p.updated_at) FROM product_categories pc JOIN products p ON p.id = pc.product_id WHERE pc.category_id = c.id) AS lastmod
             FROM categories c WHERE c.is_visible`),
    query(`SELECT b.slug, b.logo_url, (SELECT max(updated_at) FROM products WHERE brand_id = b.id) AS lastmod
             FROM brands b WHERE EXISTS (SELECT 1 FROM products p WHERE p.brand_id = b.id AND p.is_active)`),
    getSettings(),
  ]);
  const latest = products.rows.reduce((m, p) => (p.updated_at > m ? p.updated_at : m), new Date(0));
  const heroImages = (settings.hero || []).map((h) => h.image).filter(Boolean);

  const body = [
    urlEntry('', latest, heroImages),
    urlEntry('/shop', latest),
    urlEntry('/brands', latest),
    urlEntry('/routine', latest),
    urlEntry('/policies', null),
    urlEntry('/about', null),
    urlEntry('/faq', null),
    urlEntry('/contact', null),
    urlEntry('/shipping', null),
    ...categories.rows.map((c) => urlEntry(`/category/${c.slug}`, c.lastmod)),
    ...brands.rows.map((b) => urlEntry(`/brand/${b.slug}`, b.lastmod, b.logo_url ? [b.logo_url] : [])),
    ...products.rows.map((p) => urlEntry(`/product/${p.slug}`, p.updated_at, p.images)),
  ].join('');

  res
    .type('application/xml')
    .set('Cache-Control', 'no-cache').set('CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ` +
        `xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${body}</urlset>`,
    );
});

/* ------------------------- llms.txt (GEO / AI search) ------------------------ */

async function llmsData() {
  const s = await getSettings();
  const [{ rows: products }, { rows: categories }, { rows: brands }] = await Promise.all([
    query(
      `SELECT p.slug, p.name->>'fr' AS name, p.price, p.compare_at_price, p.stock, b.name AS brand,
              p.short_description, p.description,
              (SELECT string_agg(c.name->>'fr', ', ') FROM product_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.product_id = p.id AND c.kind = 'type') AS types,
              (SELECT count(*) FROM reviews r WHERE r.product_id = p.id AND r.is_approved AND NOT r.is_sample) AS real_reviews,
              (SELECT round(avg(rating)::numeric, 1) FROM reviews r WHERE r.product_id = p.id AND r.is_approved AND NOT r.is_sample) AS real_rating
         FROM products p LEFT JOIN brands b ON b.id = p.brand_id WHERE p.is_active ORDER BY p.sales_count DESC`,
    ),
    query(`SELECT slug, kind, name->>'fr' AS name, description->>'fr' AS intro FROM categories WHERE is_visible ORDER BY kind, position`),
    query(`SELECT b.slug, b.name, count(p.id) AS n FROM brands b JOIN products p ON p.brand_id = b.id AND p.is_active GROUP BY b.id ORDER BY b.name`),
  ]);
  return { s, products, categories, brands };
}

function llmsHeader(s) {
  const sh = s.shipping;
  return [
    `# ${BRAND}`,
    '',
    `> ${tr(s.seo.description, 'fr')}`,
    '',
    `${BRAND} is an online shop based in ${s.contact.city}, Morocco, selling 100% authentic Korean skincare (K-beauty). Slogan: "Filter Insta kimshi, walakin skin care kib9a".`,
    '',
    '## Key facts',
    '- Payment: cash on delivery only, everywhere in Morocco. No online payment.',
    `- Delivery: ${sh.casablancaFee} MAD in Casablanca, ${sh.otherFee} MAD in other Moroccan cities, free for orders of more than ${sh.freeAboveItems} products. 24-48h in Casablanca, 2-4 working days elsewhere.`,
    '- Languages: French (/fr), English (/en), Arabic (/ar).',
    `- Contact: phone ${s.contact.phone}, WhatsApp +${s.contact.whatsapp}, email ${s.contact.email}.`,
    `- Online shop: ${SITE}/fr/shop · Routine builder (free skin diagnosis): ${SITE}/fr/routine · Shipping & payment: ${SITE}/fr/shipping · FAQ: ${SITE}/fr/faq`,
  ];
}

seoRouter.get('/llms.txt', async (_req, res) => {
  const { s, products, categories, brands } = await llmsData();
  const lines = [
    ...llmsHeader(s),
    `- Full catalog with descriptions: ${SITE}/llms-full.txt`,
    '',
    '## Product types',
    ...categories.filter((c) => c.kind === 'type').map((c) => `- [${c.name}](${SITE}/fr/category/${c.slug})`),
    '',
    '## Skin-type routines',
    ...categories.filter((c) => c.kind === 'routine').map((c) => `- [${c.name}](${SITE}/fr/category/${c.slug})`),
    '',
    '## Brands',
    ...brands.map((b) => `- [${b.name}](${SITE}/fr/brand/${b.slug}) (${b.n} products)`),
    '',
    '## Products',
    ...products.map(
      (p) =>
        `- [${p.name}](${SITE}/fr/product/${p.slug}): ${p.price} MAD${p.brand ? ` · ${p.brand}` : ''}${p.types ? ` · ${p.types}` : ''}. ${truncate(stripHtml(p.short_description?.fr || ''), 140)}`,
    ),
  ];
  res.type('text/plain; charset=utf-8').set('Cache-Control', 'no-cache').set('CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600').send(lines.join('\n'));
});

seoRouter.get('/llms-full.txt', async (_req, res) => {
  const { s, products, categories } = await llmsData();
  const lines = [...llmsHeader(s), '', '## Categories', ''];
  categories.forEach((c) => lines.push(`### ${c.name}`, `${SITE}/fr/category/${c.slug}`, c.intro || '', ''));
  lines.push('## Products', '');
  products.forEach((p) => {
    lines.push(
      `### ${p.name}`,
      `- URL: ${SITE}/fr/product/${p.slug} (English: ${SITE}/en/product/${p.slug}, Arabic: ${SITE}/ar/product/${p.slug})`,
      `- Brand: ${p.brand || '-'} · Type: ${p.types || '-'}`,
      `- Price: ${p.price} MAD${p.compare_at_price > p.price ? ` (instead of ${p.compare_at_price} MAD)` : ''} · ${p.stock > 0 ? 'In stock' : 'Out of stock'}`,
      p.real_reviews > 0 ? `- Customer rating: ${p.real_rating}/5 (${p.real_reviews} reviews)` : '',
      '',
      stripHtml(p.description?.fr || p.short_description?.fr || ''),
      '',
    );
  });
  res.type('text/plain; charset=utf-8').set('Cache-Control', 'no-cache').set('CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600').send(lines.filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n'));
});

/* ------------------------- Google Merchant Center feed ------------------------ */

/** RSS 2.0 product feed for Google Merchant Center (free listings, Shopping, Images tab). */
seoRouter.get('/feeds/google-merchant.xml', async (_req, res) => {
  const settings = await getSettings();
  const { rows } = await query(
    `SELECT p.id, p.slug, p.name->>'fr' AS name, p.description->>'fr' AS description, p.short_description->>'fr' AS short,
            p.price, p.compare_at_price, p.stock, b.name AS brand,
            coalesce((SELECT json_agg(url ORDER BY position) FROM product_images WHERE product_id = p.id), '[]') AS images,
            (SELECT c.name->>'fr' FROM product_categories pc JOIN categories c ON c.id = pc.category_id
              WHERE pc.product_id = p.id AND c.kind = 'type' LIMIT 1) AS type
       FROM products p LEFT JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active AND EXISTS (SELECT 1 FROM product_images WHERE product_id = p.id)
      ORDER BY p.id`,
  );
  const s = settings.shipping;
  const item = (p) => {
    const onSale = p.compare_at_price && p.compare_at_price > p.price;
    const [main, ...more] = p.images.map(absolute);
    return [
      '<item>',
      `<g:id>${p.id}</g:id>`,
      `<g:title>${esc(truncate(p.name, 150))}</g:title>`,
      `<g:description>${esc(truncate(stripHtml(p.description || p.short || p.name), 4900))}</g:description>`,
      `<g:link>${SITE}/fr/product/${p.slug}</g:link>`,
      `<g:image_link>${esc(main)}</g:image_link>`,
      ...more.slice(0, 10).map((u) => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`),
      `<g:availability>${p.stock > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>`,
      `<g:price>${(onSale ? p.compare_at_price : p.price).toFixed(2)} MAD</g:price>`,
      onSale ? `<g:sale_price>${p.price.toFixed(2)} MAD</g:sale_price>` : '',
      p.brand ? `<g:brand>${esc(p.brand)}</g:brand>` : '',
      '<g:condition>new</g:condition>',
      '<g:identifier_exists>no</g:identifier_exists>',
      // Health & Beauty > Personal Care > Cosmetics > Skin Care
      '<g:google_product_category>567</g:google_product_category>',
      p.type ? `<g:product_type>Soins du visage &gt; ${esc(p.type)}</g:product_type>` : '',
      `<g:shipping><g:country>MA</g:country><g:service>Livraison standard</g:service><g:price>${s.otherFee.toFixed(2)} MAD</g:price></g:shipping>`,
      '</item>',
    ]
      .filter(Boolean)
      .join('');
  };
  res
    .type('application/xml')
    .set('Cache-Control', 'no-cache').set('CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>` +
        `<title>${BRAND}</title><link>${SITE}/fr</link><description>${esc(tr(settings.seo.description, 'fr'))}</description>` +
        rows.map(item).join('') +
        '</channel></rss>',
    );
});

/* --------------------------------- IndexNow --------------------------------- */

// Ownership proof for IndexNow (Bing, Yandex, Seznam, Naver…): https://site/<key>.txt
seoRouter.get('/:file', (req, res, next) => {
  const key = indexNowKey();
  if (key && req.params.file === `${key}.txt`) return res.type('text/plain').send(key);
  next();
});
