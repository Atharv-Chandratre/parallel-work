"use client";

import { useState, useRef, useEffect } from "react";
import { useBoardStore } from "@/store/boardStore";

export default function AddColumn() {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const addColumn = useBoardStore((s) => s.addColumn);

  useEffect(() => {
    if (isAdding) inputRef.current?.focus();
  }, [isAdding]);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (trimmed) {
      addColumn(trimmed);
      setTitle("");
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsAdding(false);
      setTitle("");
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex h-full min-h-[200px] w-72 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 transition-colors hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
      >
        <span className="text-sm font-medium">+ Add Project</span>
      </button>
    );
  }

  return (
    <div className="w-72 shrink-0 rounded-xl bg-[var(--color-column-bg)] p-3">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Project name..."
        className="w-full rounded-lg bg-[var(--color-card-bg)] px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none border border-[var(--color-card-border)] focus:border-blue-500"
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={handleSubmit}
          className="rounded px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors cursor-pointer"
        >
          Add Project
        </button>
        <button
          onClick={() => {
            setIsAdding(false);
            setTitle("");
          }}
          className="rounded px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
