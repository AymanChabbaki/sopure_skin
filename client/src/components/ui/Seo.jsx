import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { LOCALES } from '../../i18n/index.js';

const SITE = import.meta.env.VITE_SITE_URL || window.location.origin;
const OG_LOCALES = { fr: 'fr_MA', en: 'en_US', ar: 'ar_MA' };

/**
 * Per-page metadata. React 19 hoists <title>/<meta>/<link> into <head>.
 * The server injects the same tags for crawlers on the first HTML response.
 */
export function Seo({ title, description, image, type = 'website', noindex = false, jsonLd }) {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();
  const rest = pathname.replace(/^\/(fr|en|ar)/, '');
  const url = `${SITE}${pathname}`;
  const fullTitle = title ? `${title} | So Pure Skin` : 'So Pure Skin';
  const img = image ? (image.startsWith('http') ? image : `${SITE}${image}`) : `${SITE}/android-chrome-512x512.png`;

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'} />
      {LOCALES.map((l) => (
        <link key={l} rel="alternate" hrefLang={l} href={`${SITE}/${l}${rest}`} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${SITE}/fr${rest}`} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta property="og:locale" content={OG_LOCALES[i18n.language]} />
      <meta name="twitter:card" content="summary_large_image" />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </>
  );
}
