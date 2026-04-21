import { create } from "zustand";

type UiState = {
  isShortcutsOpen: boolean;
  isCommandPaletteOpen: boolean;

  openShortcuts: () => void;
  closeShortcuts: () => void;
  toggleShortcuts: () => void;

  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  isShortcutsOpen: false,
  isCommandPaletteOpen: false,

  openShortcuts: () => set({ isShortcutsOpen: true }),
  closeShortcuts: () => set({ isShortcutsOpen: false }),
  toggleShortcuts: () => set((s) => ({ isShortcutsOpen: !s.isShortcutsOpen })),

  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () => set((s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),
}));
