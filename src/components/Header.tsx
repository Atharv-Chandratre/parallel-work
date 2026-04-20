"use client";

import { useEffect, useState, useRef } from "react";
import { useBoardStore } from "@/store/boardStore";
import { useFilterStore, isFilterActive } from "@/store/filterStore";
import { Board, STATUS_CONFIG, TaskStatus } from "@/lib/types";
import type { LinkType } from "@/lib/linkUtils";

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
  const columns = useBoardStore((s) => s.board.columns);
  const exportBoard = useBoardStore((s) => s.exportBoard);
  const importBoard = useBoardStore((s) => s.importBoard);
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

  const allTasks = columns.flatMap((c) => c.tasks);
  const queued = allTasks.filter((t) => t.status === "queued").length;
  const inReview = allTasks.filter((t) => t.status === "in-review").length;
  const todo = allTasks.filter((t) => t.status === "todo").length;

  const searchQuery = useFilterStore((s) => s.searchQuery);
  const setSearchQuery = useFilterStore((s) => s.setSearchQuery);
  const statusFilters = useFilterStore((s) => s.statusFilters);
  const toggleStatusFilter = useFilterStore((s) => s.toggleStatusFilter);
  const linkTypeFilters = useFilterStore((s) => s.linkTypeFilters);
  const toggleLinkTypeFilter = useFilterStore((s) => s.toggleLinkTypeFilter);
  const clearFilters = useFilterStore((s) => s.clearFilters);
  const filterActive = useFilterStore((s) => isFilterActive(s));

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
        <div className="hidden sm:flex items-center gap-2 text-xs">
          {queued > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-yellow-500 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
              {queued} queued
            </span>
          )}
          {inReview > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-blue-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              {inReview} in review
            </span>
          )}
          {todo > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-zinc-500 dark:text-zinc-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              {todo} to do
            </span>
          )}
        </div>
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
            className="w-full rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card-bg)] py-1 pl-7 pr-2 text-xs text-zinc-700 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Status filters">
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
        <div
          className="hidden lg:flex items-center gap-1"
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
        {filterActive && (
          <button
            onClick={clearFilters}
            aria-label="Clear all filters"
            className="rounded-full px-2 py-0.5 text-[10px] font-medium text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
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
