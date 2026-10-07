import { LOCALES, DEFAULT_LOCALE } from '../config.js';

export function slugify(input) {
  return String(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export const pickLocale = (value) => (LOCALES.includes(value) ? value : DEFAULT_LOCALE);

/** Reads a translated JSONB value with French fallback. */
export function tr(field, locale) {
  if (!field || typeof field !== 'object') return field ?? '';
  return field[locale] || field[DEFAULT_LOCALE] || field.en || '';
}

export const stripHtml = (html = '') =>
  String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const truncate = (text, max = 160) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Express 5 forwards rejected promises automatically, this keeps handlers terse. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
