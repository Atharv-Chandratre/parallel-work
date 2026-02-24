"use client";

import { useEffect, useState } from "react";
import { useBoardStore } from "@/store/boardStore";

export default function Header() {
  const columns = useBoardStore((s) => s.board.columns);
  const [dark, setDark] = useState(true);

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

  const allTasks = columns.flatMap((c) => c.tasks);
  const inProgress = allTasks.filter((t) => t.status === "in-progress").length;
  const review = allTasks.filter((t) => t.status === "review").length;
  const queued = allTasks.filter((t) => t.status === "queued").length;

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

      <button
        onClick={toggleDark}
        className="rounded-lg p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
    </header>
  );
}
