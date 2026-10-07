import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/** Prefixes internal paths with the active language: lp('/shop') -> '/fr/shop' */
export function useLocalePath() {
  const { i18n } = useTranslation();
  return useCallback((path = '') => `/${i18n.language}${path === '/' ? '' : path}`, [i18n.language]);
}
