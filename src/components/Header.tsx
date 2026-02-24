"use client";

import { useEffect, useState, useRef } from "react";
import { useBoardStore } from "@/store/boardStore";
import { Board } from "@/lib/types";

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
          alert(
            "Invalid file format. The JSON must contain a board with id and columns."
          );
          return;
        }
        if (
          !confirm(
            "Importing will replace all current data. Continue?"
          )
        ) {
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
  const inProgress = allTasks.filter((t) => t.status === "in-progress").length;
  const review = allTasks.filter((t) => t.status === "review").length;
  const queued = allTasks.filter((t) => t.status === "queued").length;

  const btnClass =
    "rounded-lg p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer";

  return (
    <header className="flex items-center justify-between border-b border-[var(--color-card-border)] px-5 py-3 bg-[var(--color-column-bg)]">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-bold tracking-tight text-zinc-800 dark:text-zinc-100">
          Parallel
        </h1>
        <div className="hidden sm:flex items-center gap-3 text-xs">
          {inProgress > 0 && (
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              {inProgress} in progress
            </span>
          )}
          {review > 0 && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {review} needs review
            </span>
          )}
          {queued > 0 && (
            <span className="text-zinc-500">{queued} queued</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleExport}
          className={btnClass}
          title="Export board as JSON"
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
          title="Import board from JSON"
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
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
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
