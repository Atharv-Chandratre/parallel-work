"use client";

import { useState } from "react";
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
  const cycleTaskStatus = useBoardStore((s) => s.cycleTaskStatus);
  const deleteTask = useBoardStore((s) => s.deleteTask);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", task, columnId },
  });

  const statusColor = STATUS_CONFIG[task.status].color;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeft: `3px solid ${statusColor}`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card-bg)] transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      <div className="flex items-start gap-2 p-3">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab rounded p-0.5 text-zinc-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-500 dark:hover:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:cursor-grabbing transition-all shrink-0"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </div>
        <div className="flex-1 min-w-0 grid" style={{ gridTemplateColumns: "minmax(0, min-content)" }}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="min-w-0 text-left text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white cursor-pointer truncate block"
          >
            {task.title}
          </button>
          <div className="mt-1.5 min-w-0">
            <StatusBadge status={task.status} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
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
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
