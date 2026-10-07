import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      add: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === product.id);
          const items = existing
            ? state.items.map((i) => (i.id === product.id ? { ...i, quantity: Math.min(i.quantity + quantity, 50) } : i))
            : [
                ...state.items,
                {
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  brand: product.brand?.name,
                  price: product.price,
                  compareAtPrice: product.compareAtPrice,
                  image: product.images?.[0]?.thumbUrl || product.images?.[0]?.url,
                  quantity,
                },
              ];
          return { items, isOpen: true };
        }),
      setQuantity: (id, quantity) =>
        set((state) => ({
          items: quantity <= 0 ? state.items.filter((i) => i.id !== id) : state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),
      remove: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    { name: 'sps-cart', partialize: (s) => ({ items: s.items }) },
  ),
);

export const useCartCount = () => useCart((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
export const useCartSubtotal = () => useCart((s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0));
