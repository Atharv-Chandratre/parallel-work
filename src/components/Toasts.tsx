"use client";

import { useToastStore } from "@/store/toastStore";

const KIND_STYLES: Record<string, string> = {
  info: "bg-zinc-800 text-zinc-100 border-zinc-700",
  error: "bg-red-600/95 text-white border-red-500",
  success: "bg-emerald-600/95 text-white border-emerald-500",
};

export default function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto min-w-[240px] max-w-[420px] rounded-lg border px-3 py-2 text-xs shadow-lg ${KIND_STYLES[t.kind] ?? KIND_STYLES.info}`}
        >
          <div className="flex items-start gap-2">
            <span className="flex-1 break-words">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-inherit/80 opacity-70 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
