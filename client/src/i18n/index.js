import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.js';
import en from './locales/en.js';
import ar from './locales/ar.js';

export const LOCALES = ['fr', 'en', 'ar'];
export const DEFAULT_LOCALE = 'fr';
export const LOCALE_LABELS = { fr: 'Français', en: 'English', ar: 'العربية' };
export const LOCALE_SHORT = { fr: 'FR', en: 'EN', ar: 'ع' };

export const isLocale = (value) => LOCALES.includes(value);

/** Locale from the URL first, then the last choice, then the browser. */
export function detectLocale() {
  const fromPath = window.location.pathname.split('/')[1];
  if (isLocale(fromPath)) return fromPath;
  try {
    const saved = localStorage.getItem('sps-lang');
    if (isLocale(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  const browser = navigator.language?.slice(0, 2);
  return isLocale(browser) ? browser : DEFAULT_LOCALE;
}

export function applyDocumentLocale(lng) {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  try {
    localStorage.setItem('sps-lang', lng);
  } catch {
    /* storage unavailable */
  }
}

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en }, ar: { translation: ar } },
  lng: detectLocale(),
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  returnObjects: true,
});

i18n.on('languageChanged', applyDocumentLocale);
applyDocumentLocale(i18n.language);

export default i18n;
