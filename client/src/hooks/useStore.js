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

/** Shipping fee preview, mirrors the server rule (the server stays the source of truth). */
export function computeShipping(shipping, city, itemsCount) {
  if (!shipping) return null;
  if (itemsCount > shipping.freeAboveItems) return 0;
  if (!city) return null;
  const isCasa = shipping.casablancaAliases.some((a) => a.toLowerCase() === city.trim().toLowerCase());
  return isCasa ? shipping.casablancaFee : shipping.otherFee;
}
