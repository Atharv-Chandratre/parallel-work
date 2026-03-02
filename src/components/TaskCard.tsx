"use client";

import { useState, useRef, useEffect } from "react";
import { Task, STATUS_CONFIG } from "@/lib/types";
import { useBoardStore } from "@/store/boardStore";
import StatusBadge from "./StatusBadge";
import TaskDetail from "./TaskDetail";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TaskCardProps = {
  task: Task;
  columnId: string;
};

export default function TaskCard({ task, columnId }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const cycleTaskStatus = useBoardStore((s) => s.cycleTaskStatus);
  const updateTask = useBoardStore((s) => s.updateTask);
  const deleteTask = useBoardStore((s) => s.deleteTask);

  useEffect(() => {
    if (isRenaming) renameInputRef.current?.focus();
  }, [isRenaming]);

  const saveRename = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask(columnId, task.id, { title: trimmed });
    } else {
      setEditTitle(task.title);
    }
    setIsRenaming(false);
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task, columnId },
  });

  const statusColor = STATUS_CONFIG[task.status].color;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeft: `3px solid ${statusColor}`,
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isRenaming) return;
    const target = e.target as HTMLElement;
    if (target.closest("a") || target.closest("button") || target.closest("input") || target.closest("textarea")) return;
    setExpanded(!expanded);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className={`group rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card-bg)] transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      <div className="flex items-start gap-2 p-3">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab rounded p-0.5 text-zinc-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-500 dark:hover:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:cursor-grabbing transition-all shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={saveRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
                if (e.key === "Escape") {
                  setEditTitle(task.title);
                  setIsRenaming(false);
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full min-w-0 rounded bg-[var(--color-card-bg)] px-1.5 py-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-100 outline-none border border-[var(--color-card-border)] focus:border-blue-500 cursor-text"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditTitle(task.title);
                setIsRenaming(true);
              }}
              className="w-full min-w-0 text-left text-sm font-medium text-zinc-700 dark:text-zinc-200 block select-none break-words"
              title="Double-click to rename"
            >
              {task.title}
            </span>
          )}
          <div className="mt-1.5 min-w-0">
            <StatusBadge status={task.status} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            {task.githubUrl && (
              <a
                href={task.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                title={task.githubUrl}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
            )}
            <button
              onClick={() => deleteTask(columnId, task.id)}
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all cursor-pointer"
              title="Delete task"
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
          <div className="flex items-center gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (task.status !== "todo") cycleTaskStatus(columnId, task.id, -1);
              }}
              disabled={task.status === "todo"}
              aria-disabled={task.status === "todo"}
              className={`flex items-center justify-center w-5 h-5 rounded disabled:opacity-100 ${task.status === "todo" ? "text-zinc-400 dark:text-zinc-500 cursor-not-allowed" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"}`}
              title="Previous status"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (task.status !== "done") cycleTaskStatus(columnId, task.id, 1);
              }}
              disabled={task.status === "done"}
              aria-disabled={task.status === "done"}
              className={`flex items-center justify-center w-5 h-5 rounded disabled:opacity-100 ${task.status === "done" ? "text-zinc-400 dark:text-zinc-500 cursor-not-allowed" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"}`}
              title="Next status"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {expanded && <TaskDetail task={task} columnId={columnId} />}
    </div>
  );
}
