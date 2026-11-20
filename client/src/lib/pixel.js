/**
 * Meta Pixel (So Pure Skin, 1680885362620185). The base code is in index.html (first PageView);
 * this helper sends the shop events. Admin pages are never tracked, and an ad blocker simply leaves fbq undefined.
 */
const isAdmin = () => typeof window === 'undefined' || window.location.pathname.startsWith('/admin');

export function track(event, params = {}, eventID) {
  if (isAdmin() || typeof window.fbq !== 'function') return;
  try {
    window.fbq('track', event, { currency: 'MAD', ...params }, eventID ? { eventID } : undefined);
  } catch {
    // tracking must never break the shop
  }
}

/** Purchase once per order, even if the confirmation page is reloaded. */
export function trackPurchase(order) {
  const key = `fbq-purchase-${order.number}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // storage unavailable: send anyway
  }
  const ids = (order.products || []).map((p) => String(p.sku));
  track('Purchase', { value: Number(order.total) || 0, content_ids: ids, content_type: 'product', num_items: order.itemsCount }, `purchase-${order.number}`);
}
