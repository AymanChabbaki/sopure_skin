/**
 * Page-specific extra structured data only (e.g. the FAQ written in the client translations).
 * Title, description, canonical, hreflang, Open Graph and the main JSON-LD come from the server
 * through <ServerSeo />, so crawlers and visitors always get the same metadata.
 */
export function Seo({ jsonLd }) {
  if (!jsonLd) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />;
}
