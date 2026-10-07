import { create } from 'zustand';

export const useUi = create((set) => ({
  searchOpen: false,
  menuOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
}));
