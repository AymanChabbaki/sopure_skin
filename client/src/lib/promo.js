/**
 * Same rules as server/src/lib/promo.js, for display only: the server recomputes the discount on the order.
 * Returns { discount, below } where `below` is the amount missing to reach the code's minimum.
 */
export function promoDiscount(promo, subtotal, shippingFee) {
  if (!promo) return { discount: 0, below: 0 };
  if (subtotal < promo.minSubtotal) return { discount: 0, below: promo.minSubtotal - subtotal };
  if (promo.type === 'percent') return { discount: Math.min(Math.round((subtotal * promo.value) / 100), subtotal), below: 0 };
  if (promo.type === 'fixed') return { discount: Math.min(promo.value, subtotal), below: 0 };
  return { discount: shippingFee ?? 0, below: 0 }; // free delivery
}
