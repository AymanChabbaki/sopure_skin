import { useQueries, useQuery, keepPreviousData } from '@tanstack/react-query';
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
  return useQuery({ queryKey: ['categories', lang], queryFn: () => api('/categories', { params: { lang } }), staleTime: 30_000 });
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
/** Free delivery: more than N products, or products worth at least freeAboveAmount DH (same rule as the server). */
export const isFreeShipping = (shipping, itemsCount, subtotal = 0) =>
  Boolean(shipping) &&
  ((shipping.freeAboveItems > 0 && itemsCount > shipping.freeAboveItems) || (shipping.freeAboveAmount > 0 && subtotal >= shipping.freeAboveAmount));

/**
 * Values for the free-delivery texts, with only the rules that are on (0 = off in the admin):
 * {{rule}} = "dès 1 000 DH d'achat" / "pour plus de 5 produits" / both, {{ruleTitle}} = the same as a heading.
 */
export function freeShippingParams(shipping, t) {
  const items = shipping?.freeAboveItems ?? 5;
  const amount = shipping?.freeAboveAmount ?? 0;
  const kind = items > 0 && amount > 0 ? 'both' : amount > 0 ? 'amount' : 'items';
  const p = { n: items, amount: amount.toLocaleString('fr-MA') };
  return { ...p, rule: t(`common.freeRule.${kind}`, p), ruleTitle: t(`common.freeRuleTitle.${kind}`, p) };
}

export function computeShipping(shipping, city, itemsCount, subtotal = 0) {
  if (!shipping) return null;
  if (isFreeShipping(shipping, itemsCount, subtotal)) return 0;
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

/** Every active pack (home page rail, shop, /packs page). */
export function useAllPacks() {
  const lang = useLang();
  return useQuery({ queryKey: ['packs', lang, 'all'], queryFn: () => api('/packs', { params: { lang } }), staleTime: 60_000 });
}

/** Packs offered for a routine (category slug). */
export function useRoutinePacks(categories) {
  const lang = useLang();
  const results = useQueries({
    queries: [...new Set(categories)].map((category) => ({
      queryKey: ['packs', lang, category],
      queryFn: () => api('/packs', { params: { lang, category } }),
      staleTime: 60_000,
    })),
  });
  const unique = new Map(results.flatMap(({ data }) => (data ?? []).map((pack) => [pack.id, pack])));
  return { packs: [...unique.values()], isLoading: results.some((r) => r.isLoading), isError: results.some((r) => r.isError) };
}

export function useVideos() {
  const lang = useLang();
  return useQuery({ queryKey: ['videos', lang], queryFn: () => api('/videos', { params: { lang } }), staleTime: 60_000 });
}
