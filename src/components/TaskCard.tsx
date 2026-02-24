"use client";

import { useState } from "react";
import { Task } from "@/lib/types";
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card-bg)] transition-shadow hover:shadow-md ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      <div className="flex items-start gap-2 p-3">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-zinc-600 hover:text-zinc-400 active:cursor-grabbing"
        >
          <svg
            width="12"
            height="12"
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
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white cursor-pointer truncate block"
          >
            {task.title}
          </button>
          <div className="mt-1.5 flex items-center gap-2">
            <StatusBadge
              status={task.status}
              onClick={(e) => {
                e.stopPropagation();
                cycleTaskStatus(columnId, task.id);
              }}
            />
          </div>
        </div>
        <button
          onClick={() => deleteTask(columnId, task.id)}
          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all cursor-pointer mt-0.5"
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
      {expanded && <TaskDetail task={task} columnId={columnId} />}
    </div>
  );
}
