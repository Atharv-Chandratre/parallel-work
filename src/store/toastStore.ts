import { create } from "zustand";
import { nanoid } from "nanoid";

export type ToastKind = "info" | "error" | "success";

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ToastState = {
  toasts: Toast[];
  push: (message: string, kind?: ToastKind) => string;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, kind = "info") => {
    const id = nanoid();
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    // Auto-dismiss after 5s
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 5000);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
