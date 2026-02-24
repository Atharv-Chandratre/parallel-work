"use client";

import { useState, useRef, useEffect } from "react";
import { useBoardStore } from "@/store/boardStore";

type AddTaskProps = {
  columnId: string;
};

export default function AddTask({ columnId }: AddTaskProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const addTask = useBoardStore((s) => s.addTask);

  useEffect(() => {
    if (isAdding) inputRef.current?.focus();
  }, [isAdding]);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (trimmed) {
      addTask(columnId, trimmed);
      setTitle("");
      inputRef.current?.focus();
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
        className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-card-bg)] hover:text-zinc-700 dark:hover:text-white cursor-pointer"
      >
        + Add task
      </button>
    );
  }

  return (
    <div className="rounded-lg bg-[var(--color-card-bg)] border border-[var(--color-card-border)] p-2">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) setIsAdding(false);
        }}
        placeholder="Task title..."
        className="w-full bg-transparent text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none"
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={handleSubmit}
          className="rounded px-2.5 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors cursor-pointer"
        >
          Add
        </button>
        <button
          onClick={() => {
            setIsAdding(false);
            setTitle("");
          }}
          className="rounded px-2.5 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
