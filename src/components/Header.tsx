"use client";

import { useEffect, useState, useRef } from "react";
import { useBoardStore } from "@/store/boardStore";
import { useFilterStore, isFilterActive } from "@/store/filterStore";
import { useUiStore } from "@/store/uiStore";
import { Board, STATUS_CONFIG, TaskStatus } from "@/lib/types";
import type { LinkType } from "@/lib/linkUtils";
import { formatShortcutForPill } from "@/lib/shortcuts";
import { useIsMac } from "@/lib/useIsMac";
import BoardPicker from "./BoardPicker";

function validateBoard(data: unknown): data is Board {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.id !== "string") return false;
  if (!Array.isArray(obj.columns)) return false;
  for (const col of obj.columns) {
    if (typeof col !== "object" || !col) return false;
    if (typeof col.id !== "string" || typeof col.title !== "string") return false;
    if (!Array.isArray(col.tasks)) return false;
  }
  return true;
}

export default function Header() {
  const exportBoard = useBoardStore((s) => s.exportBoard);
  const importBoard = useBoardStore((s) => s.importBoard);
  const openCommandPalette = useUiStore((s) => s.openCommandPalette);
  const openShortcuts = useUiStore((s) => s.openShortcuts);
  const isMac = useIsMac();
  const pill = formatShortcutForPill(isMac);
  const [dark, setDark] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("parallel-dark-mode");
    const isDark = stored === null ? true : stored === "true";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration: localStorage is unavailable during server render
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("parallel-dark-mode", String(next));
  };

  const handleExport = () => {
    const json = exportBoard();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parallel-board-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!validateBoard(data)) {
          alert("Invalid file format. The JSON must contain a board with id and columns.");
          return;
        }
        if (!confirm("Importing will replace all current data. Continue?")) {
          return;
        }
        importBoard(data);
      } catch {
        alert("Failed to parse the file. Make sure it is valid JSON.");
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const searchQuery = useFilterStore((s) => s.searchQuery);
  const setSearchQuery = useFilterStore((s) => s.setSearchQuery);
  const statusFilters = useFilterStore((s) => s.statusFilters);
  const toggleStatusFilter = useFilterStore((s) => s.toggleStatusFilter);
  const linkTypeFilters = useFilterStore((s) => s.linkTypeFilters);
  const toggleLinkTypeFilter = useFilterStore((s) => s.toggleLinkTypeFilter);
  const clearFilters = useFilterStore((s) => s.clearFilters);
  const filterActive = useFilterStore((s) => isFilterActive(s));
  const activeFilterCount = statusFilters.length + linkTypeFilters.length;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!filtersPopoverRef.current?.contains(e.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [filtersOpen]);

  const STATUS_CHIPS: TaskStatus[] = ["todo", "queued", "in-review", "done"];
  const LINK_CHIPS: { kind: LinkType; label: string }[] = [
    { kind: "github", label: "GitHub" },
    { kind: "jira", label: "Jira" },
    { kind: "slack", label: "Slack" },
    { kind: "decision-systems", label: "DV" },
  ];

  const btnClass =
    "rounded-lg p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer";

  return (
    <header className="relative z-10 flex items-center justify-between border-b border-[var(--color-card-border)] px-5 py-3 bg-[var(--color-column-bg)] shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue-500">
            <rect x="3" y="2" width="4" height="20" rx="2" fill="currentColor" opacity="0.9" />
            <rect x="10" y="5" width="4" height="14" rx="2" fill="currentColor" opacity="0.6" />
            <rect x="17" y="8" width="4" height="8" rx="2" fill="currentColor" opacity="0.35" />
          </svg>
          <h1 className="text-base font-bold tracking-tight text-zinc-800 dark:text-zinc-100">
            Parallel
          </h1>
        </div>
        <BoardPicker />
      </div>

      <div className="hidden md:flex flex-1 items-center justify-center gap-2 px-4">
        <div className="relative w-full max-w-md">
          <svg
            className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
            className="w-full rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card-bg)] py-1 pl-7 pr-14 text-xs text-zinc-700 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
          <button
            type="button"
            onClick={openCommandPalette}
            title="Open command palette"
            aria-label="Open command palette"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            {pill.keys.map((k, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && <span className="text-zinc-400">+</span>}
                <span>{k}</span>
              </span>
            ))}
          </button>
        </div>
        <div className="relative" ref={filtersPopoverRef}>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={filtersOpen}
            aria-label={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : "Filters"}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${
              filterActive
                ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span
                aria-hidden="true"
                className="inline-flex min-w-[1rem] items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-semibold text-white"
              >
                {activeFilterCount}
              </span>
            )}
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {filtersOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-40 mt-1 w-64 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 shadow-xl"
            >
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Status
              </div>
              <div className="mb-3 flex flex-wrap gap-1" role="group" aria-label="Status filters">
                {STATUS_CHIPS.map((status) => {
                  const active = statusFilters.includes(status);
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <button
                      key={status}
                      onClick={() => toggleStatusFilter(status)}
                      aria-pressed={active}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                        active
                          ? "text-white"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      }`}
                      style={active ? { backgroundColor: cfg.color } : undefined}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Link type
              </div>
              <div
                className="mb-3 flex flex-wrap gap-1"
                role="group"
                aria-label="Link type filters"
              >
                {LINK_CHIPS.map(({ kind, label }) => {
                  const active = linkTypeFilters.includes(kind);
                  return (
                    <button
                      key={kind}
                      onClick={() => toggleLinkTypeFilter(kind)}
                      aria-pressed={active}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                        active
                          ? "bg-blue-500 text-white"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  aria-label="Clear all filters"
                  disabled={!filterActive}
                  className="rounded-md px-2 py-0.5 text-[10px] font-medium text-zinc-500 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={openShortcuts}
          className={btnClass}
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h.01M14 14h4" />
          </svg>
        </button>
        <button
          onClick={handleExport}
          className={btnClass}
          data-tooltip="Export"
          title="Export board as JSON"
          aria-label="Export board as JSON"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className={btnClass}
          data-tooltip="Import"
          title="Import board from JSON"
          aria-label="Import board from JSON"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />

        <button
          onClick={toggleDark}
          className={btnClass}
          data-tooltip={dark ? "Light mode" : "Dark mode"}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={dark}
        >
          {dark ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
