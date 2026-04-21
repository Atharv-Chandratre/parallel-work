"use client";

import { useEffect, useId, useRef } from "react";
import { useUiStore } from "@/store/uiStore";
import { getShortcutGroups } from "@/lib/shortcuts";
import { useIsMac } from "@/lib/useIsMac";

function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:text-zinc-200 shadow-sm">
      {children}
    </kbd>
  );
}

export default function ShortcutsHelp() {
  const isOpen = useUiStore((s) => s.isShortcutsOpen);
  const close = useUiStore((s) => s.closeShortcuts);
  const isMac = useIsMac();
  const titleId = useId();
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const groups = getShortcutGroups(isMac);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-16"
      onClick={close}
      data-testid="shortcuts-help-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id={titleId} className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Keyboard shortcuts
          </h2>
          <button
            ref={closeBtnRef}
            onClick={close}
            aria-label="Close keyboard shortcuts"
            className="rounded-md p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {groups.map((group) => (
            <section key={group.title}>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {group.title}
              </h3>
              <ul className="space-y-1">
                {group.shortcuts.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-4 rounded-md px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200"
                  >
                    <span className="truncate">{s.description}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {s.keys.map((k, j) => (
                        <span key={j} className="flex items-center gap-1">
                          {j > 0 && <span className="text-zinc-400">+</span>}
                          <Keycap>{k}</Keycap>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
