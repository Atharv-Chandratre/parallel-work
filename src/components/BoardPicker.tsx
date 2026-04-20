"use client";

import { useEffect, useRef, useState } from "react";
import { useBoardStore } from "@/store/boardStore";

export default function BoardPicker() {
  const boards = useBoardStore((s) => s.boards);
  const activeBoardId = useBoardStore((s) => s.activeBoardId);
  const switchBoard = useBoardStore((s) => s.switchBoard);
  const createBoard = useBoardStore((s) => s.createBoard);
  const renameBoardById = useBoardStore((s) => s.renameBoardById);
  const deleteBoardById = useBoardStore((s) => s.deleteBoardById);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const activeBoard = boards[activeBoardId];
  const activeName = activeBoard?.name ?? "Board";
  const entries = Object.values(boards);

  const handleCreate = () => {
    const name = window.prompt("New board name?");
    if (!name?.trim()) return;
    createBoard(name.trim());
    setOpen(false);
  };

  const handleRename = (id: string, current: string) => {
    const next = window.prompt("Rename board to:", current);
    if (!next?.trim() || next.trim() === current) return;
    renameBoardById(id, next.trim());
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete board "${name}"? All its tasks will be lost.`)) return;
    deleteBoardById(id);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <span className="max-w-[180px] truncate">{activeName}</span>
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
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-1 w-64 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1 shadow-xl"
        >
          <div className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-wider text-zinc-400">
            Boards
          </div>
          {entries.map((b) => {
            const isActive = b.id === activeBoardId;
            return (
              <div
                key={b.id}
                className={`group flex items-center gap-1 px-2 py-1 text-xs ${
                  isActive
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "text-zinc-700 dark:text-zinc-200"
                }`}
              >
                <button
                  onClick={() => {
                    switchBoard(b.id);
                    setOpen(false);
                  }}
                  className="flex-1 truncate text-left hover:underline cursor-pointer"
                >
                  {b.name ?? b.id}
                </button>
                <button
                  onClick={() => handleRename(b.id, b.name ?? "")}
                  title="Rename board"
                  aria-label={`Rename board ${b.name ?? b.id}`}
                  className="rounded p-1 text-zinc-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(b.id, b.name ?? b.id)}
                  title="Delete board"
                  aria-label={`Delete board ${b.name ?? b.id}`}
                  className="rounded p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
          <div className="mt-1 border-t border-zinc-200 dark:border-zinc-700 pt-1">
            <button
              onClick={handleCreate}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <span aria-hidden="true">+</span>
              <span>New board</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
