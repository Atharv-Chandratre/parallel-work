"use client";

import { useState, useRef, useEffect } from "react";
import { Task } from "@/lib/types";
import { useBoardStore } from "@/store/boardStore";

type TaskDetailProps = {
  task: Task;
  columnId: string;
};

function formatTimestamp(ts?: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatElapsed(startTs: number): string {
  const elapsed = Date.now() - startTs;
  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export default function TaskDetail({ task, columnId }: TaskDetailProps) {
  const [notes, setNotes] = useState(task.notes);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const updateTask = useBoardStore((s) => s.updateTask);
  const titleRef = useRef<HTMLInputElement>(null);
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (task.status === "in-progress" && task.startedAt) {
      setElapsed(formatElapsed(task.startedAt));
      const interval = setInterval(() => {
        setElapsed(formatElapsed(task.startedAt!));
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [task.status, task.startedAt]);

  useEffect(() => {
    if (isEditingTitle) titleRef.current?.focus();
  }, [isEditingTitle]);

  const saveNotes = () => {
    if (notes !== task.notes) {
      updateTask(columnId, task.id, { notes });
    }
  };

  const saveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask(columnId, task.id, { title: trimmed });
    } else {
      setEditTitle(task.title);
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="border-t border-[var(--color-card-border)] px-3 pb-3 pt-2">
      {isEditingTitle ? (
        <input
          ref={titleRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveTitle();
            if (e.key === "Escape") {
              setEditTitle(task.title);
              setIsEditingTitle(false);
            }
          }}
          className="mb-2 w-full bg-transparent text-sm font-medium text-zinc-800 dark:text-zinc-200 outline-none border-b border-blue-500 pb-0.5"
        />
      ) : (
        <button
          onClick={() => setIsEditingTitle(true)}
          className="mb-2 text-left text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          Edit title
        </button>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveNotes}
        placeholder="Add notes... (what to tell the agent, review feedback, etc.)"
        rows={3}
        className="w-full resize-none rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2.5 py-2 text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
      />

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
        <span>Created: {formatTimestamp(task.createdAt)}</span>
        {task.startedAt && (
          <span>Started: {formatTimestamp(task.startedAt)}</span>
        )}
        {task.status === "in-progress" && task.startedAt && (
          <span className="text-blue-400">Elapsed: {elapsed}</span>
        )}
        {task.completedAt && (
          <span className="text-green-400">
            Done: {formatTimestamp(task.completedAt)}
          </span>
        )}
      </div>
    </div>
  );
}
