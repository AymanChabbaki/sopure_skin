/**
 * Promo code rules, shared by the public check endpoint and order creation.
 * A code takes money off the products (percent or fixed amount) or offers the delivery.
 */
export const normalizeCode = (code) => String(code || '').trim().toUpperCase();

/** Why a code cannot be used right now, or null when it can. */
export function promoProblem(promo, subtotal, now = new Date()) {
  if (!promo || !promo.is_active) return 'invalid';
  if (promo.starts_at && new Date(promo.starts_at) > now) return 'invalid';
  if (promo.ends_at && new Date(promo.ends_at) < now) return 'expired';
  if (promo.max_uses != null && promo.uses >= promo.max_uses) return 'usedUp';
  if (subtotal < Number(promo.min_subtotal)) return 'minSubtotal';
  return null;
}

/** Amount taken off, in DH (never more than what it applies to). */
export function promoDiscount(promo, subtotal, shippingFee) {
  const value = Number(promo.value);
  if (promo.type === 'percent') return Math.min(Math.round((subtotal * value) / 100), subtotal);
  if (promo.type === 'fixed') return Math.min(value, subtotal);
  return shippingFee; // free delivery
}

/** Public shape (what the cart needs to show the discount). */
export const publicPromo = (p) => ({ code: p.code, type: p.type, value: Number(p.value), minSubtotal: Number(p.min_subtotal) });

export const PROMO_MESSAGES = {
  invalid: 'This promo code is not valid',
  expired: 'This promo code has expired',
  usedUp: 'This promo code is no longer available',
  minSubtotal: 'Your cart does not reach the minimum for this promo code',
};
