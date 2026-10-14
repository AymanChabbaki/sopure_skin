import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const lineKey = (id, size) => (size ? `${id}|${size}` : String(id));

/**
 * Cart lines hold a snapshot for instant rendering; prices are always recomputed by the server at checkout.
 */
export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      /** `size` ({ label, price }) is required for products with sizes; each size is its own cart line. */
      add: (product, quantity = 1, size = null) =>
        set((state) => {
          const key = lineKey(product.id, size?.label);
          const existing = state.items.find((i) => i.key === key);
          const items = existing
            ? state.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(i.quantity + quantity, 50) } : i))
            : [
                ...state.items,
                {
                  key,
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  brand: product.brand?.name,
                  size: size?.label || null,
                  price: size?.price ?? product.price,
                  compareAtPrice: size ? size.compareAtPrice ?? null : product.compareAtPrice,
                  image: product.images?.[0]?.thumbUrl || product.images?.[0]?.url,
                  quantity,
                },
              ];
          return { items, isOpen: true };
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          items: quantity <= 0 ? state.items.filter((i) => i.key !== key) : state.items.map((i) => (i.key === key ? { ...i, quantity } : i)),
        })),
      remove: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    {
      name: 'sps-cart',
      version: 1,
      partialize: (s) => ({ items: s.items }),
      // v0 carts had one line per product, keyed by id
      migrate: (persisted) => ({ ...persisted, items: (persisted?.items || []).map((i) => ({ ...i, key: i.key || lineKey(i.id, i.size) })) }),
    },
  ),
);

export const useCartCount = () => useCart((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
export const useCartSubtotal = () => useCart((s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0));
