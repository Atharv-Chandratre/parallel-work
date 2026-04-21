"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBoardStore } from "@/store/boardStore";
import { useFilterStore } from "@/store/filterStore";
import { useUiStore } from "@/store/uiStore";

export type Command = {
  id: string;
  label: string;
  hint?: string;
  category?: string;
  run: () => void;
};

function buildCommands(): Command[] {
  const board = useBoardStore.getState().board;
  const boardActions = useBoardStore.getState();
  const filterActions = useFilterStore.getState();

  const base: Command[] = [
    {
      id: "add-project",
      label: "Add project",
      category: "Board",
      run: () => {
        const title = window.prompt("Project name?");
        if (title?.trim()) boardActions.addColumn(title.trim());
      },
    },
    {
      id: "toggle-dark",
      label: "Toggle dark mode",
      category: "View",
      run: () => {
        const isDark = document.documentElement.classList.contains("dark");
        document.documentElement.classList.toggle("dark", !isDark);
        localStorage.setItem("parallel-dark-mode", String(!isDark));
      },
    },
    {
      id: "focus-search",
      label: "Focus search",
      hint: "/",
      category: "Filters",
      run: () => {
        const input = document.querySelector<HTMLInputElement>('input[type="search"]');
        input?.focus();
      },
    },
    {
      id: "clear-filters",
      label: "Clear filters",
      category: "Filters",
      run: () => filterActions.clearFilters(),
    },
    {
      id: "undo",
      label: "Undo",
      hint: "⌘Z",
      category: "Edit",
      run: () => boardActions.undo(),
    },
    {
      id: "redo",
      label: "Redo",
      hint: "⇧⌘Z",
      category: "Edit",
      run: () => boardActions.redo(),
    },
    {
      id: "export",
      label: "Export board as JSON",
      category: "Board",
      run: () => {
        const json = boardActions.exportBoard();
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().slice(0, 10);
        const a = document.createElement("a");
        a.href = url;
        a.download = `parallel-board-${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
    },
    {
      id: "keyboard-shortcuts",
      label: "Keyboard shortcuts",
      hint: "?",
      category: "Help",
      run: () => useUiStore.getState().openShortcuts(),
    },
  ];

  // "Jump to" commands per column.
  board.columns.forEach((col) => {
    base.push({
      id: `jump-${col.id}`,
      label: `Jump to: ${col.title}`,
      category: "Projects",
      run: () => {
        // Scroll the column into view by finding its heading.
        const el = Array.from(document.querySelectorAll<HTMLHeadingElement>("h3")).find(
          (h) => h.textContent === col.title
        );
        el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      },
    });
  });

  return base;
}

function scoreMatch(label: string, query: string): number {
  if (!query) return 1;
  const l = label.toLowerCase();
  const q = query.toLowerCase();
  if (l.startsWith(q)) return 3;
  if (l.includes(q)) return 2;
  // Subsequence match
  let i = 0;
  for (const ch of l) {
    if (ch === q[i]) i++;
    if (i === q.length) return 1;
  }
  return 0;
}

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(() => buildCommands(), []);
  const results = useMemo(() => {
    return commands
      .map((c) => ({ c, s: scoreMatch(c.label, query) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ c }) => c);
  }, [commands, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const run = (cmd: Command | undefined) => {
    if (!cmd) return;
    onClose();
    // Defer so the palette's unmount/focus-restore finishes first.
    setTimeout(() => cmd.run(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[activeIndex]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          placeholder="Type a command..."
          aria-label="Command"
          className="w-full border-b border-zinc-200 dark:border-zinc-700 bg-transparent px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none"
        />
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1" role="listbox">
          {results.length === 0 && (
            <div className="px-4 py-4 text-xs text-zinc-500">No matches</div>
          )}
          {results.map((c, i) => (
            <button
              key={c.id}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => run(c)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-xs transition-colors ${
                i === activeIndex
                  ? "bg-blue-500 text-white"
                  : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                {c.category && (
                  <span
                    className={`shrink-0 text-[10px] uppercase tracking-wider ${i === activeIndex ? "text-white/75" : "text-zinc-400"}`}
                  >
                    {c.category}
                  </span>
                )}
                <span className="truncate">{c.label}</span>
              </span>
              {c.hint && (
                <span
                  className={`shrink-0 text-[10px] ${i === activeIndex ? "text-white/75" : "text-zinc-400"}`}
                >
                  {c.hint}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
