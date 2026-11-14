import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

/** All storefront queries are keyed by language so switching locale refetches translated content. */
const useLang = () => useTranslation().i18n.language;

export function useSettings() {
  const lang = useLang();
  return useQuery({ queryKey: ['settings', lang], queryFn: () => api('/settings', { params: { lang } }), staleTime: 5 * 60_000 });
}

export function useCategories() {
  const lang = useLang();
  return useQuery({ queryKey: ['categories', lang], queryFn: () => api('/categories', { params: { lang } }), staleTime: 10 * 60_000 });
}

export function useBrands() {
  const lang = useLang();
  return useQuery({ queryKey: ['brands', lang], queryFn: () => api('/brands', { params: { lang } }), staleTime: 10 * 60_000 });
}

export function useProducts(params, options = {}) {
  const lang = useLang();
  return useQuery({
    queryKey: ['products', lang, params],
    queryFn: ({ signal }) => api('/products', { params: { ...params, lang }, signal }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    ...options,
  });
}

export function useProduct(slug) {
  const lang = useLang();
  return useQuery({
    queryKey: ['product', lang, slug],
    queryFn: () => api(`/products/${encodeURIComponent(slug)}`, { params: { lang } }),
    enabled: Boolean(slug),
    retry: (count, err) => err.status !== 404 && count < 2,
  });
}

export function useArticles() {
  const lang = useLang();
  return useQuery({ queryKey: ['articles', lang], queryFn: () => api('/articles', { params: { lang } }), staleTime: 5 * 60_000 });
}

export function useArticle(slug) {
  const lang = useLang();
  return useQuery({
    queryKey: ['article', lang, slug],
    queryFn: () => api(`/articles/${encodeURIComponent(slug)}`, { params: { lang } }),
    enabled: Boolean(slug),
    retry: (count, err) => err.status !== 404 && count < 2,
  });
}

/* Shipping: same rules as server/src/lib/settings.js (the server computes the fee actually charged). */

const normCity = (v) =>
  String(v ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .trim();

/** Delivery zone of a city, or null (= other cities). */
export function shippingZone(shipping, city) {
  const c = normCity(city);
  if (!shipping || !c) return null;
  return (shipping.zones || []).find((z) => [...z.cities, ...(z.aliases || [])].some((name) => normCity(name) === c)) || null;
}

/** Shipping fee preview for the checkout. */
export function computeShipping(shipping, city, itemsCount) {
  if (!shipping) return null;
  if (itemsCount > shipping.freeAboveItems) return 0;
  if (!city) return null;
  return shippingZone(shipping, city)?.fee ?? shipping.otherFee;
}

/** Figures for texts: Casablanca fee and the range elsewhere ("30–40"). */
export function shippingSummary(shipping) {
  if (!shipping?.zones) return { casa: 20, other: '30–40', min: 30, max: 40 };
  const casa = shipping.zones.find((z) => z.id === 'casablanca')?.fee ?? shipping.otherFee;
  const others = [...shipping.zones.filter((z) => z.id !== 'casablanca').map((z) => z.fee), shipping.otherFee];
  const min = Math.min(...others);
  const max = Math.max(...others);
  return { casa, min, max, other: min === max ? `${min}` : `${min}–${max}` };
}

/** Packs offered for a routine (category slug). */
export function usePacks(category, options = {}) {
  const lang = useLang();
  return useQuery({
    queryKey: ['packs', lang, category],
    queryFn: () => api('/packs', { params: { lang, category } }),
    staleTime: 60_000,
    ...options,
  });
}

export function useVideos() {
  const lang = useLang();
  return useQuery({ queryKey: ['videos', lang], queryFn: () => api('/videos', { params: { lang } }), staleTime: 60_000 });
}
