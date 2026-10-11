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

/** Shortens on a word boundary (never mid-word) and adds an ellipsis. */
export function truncate(text, max = 160) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–-]+$/, '')}…`;
}

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
