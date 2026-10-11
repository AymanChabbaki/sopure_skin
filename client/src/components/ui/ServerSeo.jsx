import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

// React prop names for the few HTML attributes that differ
const ATTR = { hreflang: 'hrefLang', crossorigin: 'crossOrigin' };
const toProps = (attrs = {}) => Object.fromEntries(Object.entries(attrs).map(([k, v]) => [ATTR[k] || k, v]));

/**
 * Page metadata (title, description, canonical, hreflang, Open Graph, JSON-LD) computed by the server,
 * the single source of truth shared with the HTML crawlers receive.
 * First page load: the server already injected these tags (marked data-ssr), nothing to do.
 * Client-side navigation: the old tags are removed and the new ones fetched from /api/seo.
 */
export function ServerSeo() {
  const { pathname, search } = useLocation();
  const key = pathname + search;
  const firstKey = useRef(key);
  const hadServerTags = useRef(typeof document !== 'undefined' && Boolean(document.querySelector('[data-ssr]')));
  const navigated = useRef(false);
  if (key !== firstKey.current) navigated.current = true;
  const useServerTags = hadServerTags.current && !navigated.current;

  useEffect(() => {
    if (!useServerTags) document.querySelectorAll('[data-ssr]').forEach((el) => el.remove());
  }, [useServerTags]);

  const { data } = useQuery({
    queryKey: ['seo', pathname, search],
    queryFn: () => api('/seo', { params: { path: pathname, search: search.replace(/^\?/, '') } }),
    enabled: !useServerTags,
    staleTime: 60_000,
  });

  if (useServerTags || !data) return null;
  return data.tags.map((t, i) => {
    if (t.tag === 'title') return <title key="title">{t.text}</title>;
    if (t.tag === 'script') return <script key={`ld${i}`} {...toProps(t.attrs)} dangerouslySetInnerHTML={{ __html: t.text.replace(/</g, '\\u003c') }} />;
    const Tag = t.tag;
    return <Tag key={`${t.tag}${i}`} {...toProps(t.attrs)} />;
  });
}
