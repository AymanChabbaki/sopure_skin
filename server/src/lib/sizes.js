/**
 * Product sizes (50 ml, 150 ml…). Stored as JSONB on products:
 * [{ label, price (null = product price), stock, enabled }]
 */

export function normalizeSizes(sizes = []) {
  const seen = new Set();
  return sizes
    .map((s) => ({
      label: String(s.label || '').trim().slice(0, 40),
      price: s.price === null || s.price === undefined || s.price === '' ? null : Number(s.price),
      stock: Math.max(0, Math.trunc(Number(s.stock) || 0)),
      enabled: s.enabled !== false,
    }))
    .filter((s) => s.label && !seen.has(s.label.toLowerCase()) && seen.add(s.label.toLowerCase()));
}

/** Product stock when sizes are on: what can actually be bought. */
export const sizesStock = (sizes = []) => sizes.filter((s) => s.enabled).reduce((sum, s) => sum + s.stock, 0);

/** Sizes as shown on the store (disabled ones hidden). */
export function publicSizes(row) {
  if (!row.has_sizes) return [];
  return (row.sizes || [])
    .filter((s) => s.enabled)
    .map((s) => ({
      label: s.label,
      price: s.price ?? Number(row.price),
      compareAtPrice: s.price === null && row.compare_at_price ? Number(row.compare_at_price) : null,
      stock: s.stock,
      inStock: s.stock > 0,
    }));
}

/** Returns a new sizes array with `delta` applied to the stock of `label` (never below 0). */
export function adjustSize(sizes = [], label, delta) {
  return sizes.map((s) => (s.label === label ? { ...s, stock: Math.max(0, s.stock + delta) } : s));
}
