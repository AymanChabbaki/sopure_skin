import i18n from '../i18n/index.js';

const LOCALE_TAGS = { fr: 'fr-MA', en: 'en-US', ar: 'ar-MA' };

export function formatPrice(value, lng = i18n.language) {
  const amount = new Intl.NumberFormat(LOCALE_TAGS[lng] || 'fr-MA', {
    maximumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2,
    numberingSystem: 'latn',
  }).format(Number(value) || 0);
  return `${amount} ${i18n.t('common.currency', { lng })}`;
}

export const discountPercent = (price, compareAt) =>
  compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

export const cn = (...classes) => classes.filter(Boolean).join(' ');
