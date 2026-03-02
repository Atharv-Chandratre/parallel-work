"use client";

import { useState, useEffect } from "react";
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
  const [githubUrl, setGithubUrl] = useState(task.githubUrl ?? "");
  const updateTask = useBoardStore((s) => s.updateTask);
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (task.status === "queued" && task.startedAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial value when deps change
      setElapsed(formatElapsed(task.startedAt));
      const interval = setInterval(() => {
        setElapsed(formatElapsed(task.startedAt!));
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [task.status, task.startedAt]);

  const saveNotes = () => {
    if (notes !== task.notes) {
      updateTask(columnId, task.id, { notes });
    }
  };

  const saveGithubUrl = () => {
    const trimmed = githubUrl.trim();
    if (trimmed !== (task.githubUrl ?? "")) {
      updateTask(columnId, task.id, { githubUrl: trimmed || undefined });
    }
  };

  return (
    <div className="border-t border-[var(--color-card-border)] bg-zinc-50/50 dark:bg-zinc-900/30 px-3 pb-3 pt-2 rounded-b-lg">
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="What to tell the agent, review feedback, etc."
          rows={3}
          className="w-full resize-none rounded-md bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-2.5 py-2 text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-400/20 dark:focus:ring-blue-500/20 transition-all"
        />
      </div>

      <div className="mt-2 space-y-1">
        <label className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </label>
        <input
          type="url"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          onBlur={saveGithubUrl}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveGithubUrl();
          }}
          placeholder="Paste GitHub link..."
          className="w-full rounded-md bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-400/20 dark:focus:ring-blue-500/20 transition-all"
        />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {formatTimestamp(task.createdAt)}
        </span>
        {task.startedAt && (
          <span className="inline-flex items-center gap-1">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {formatTimestamp(task.startedAt)}
          </span>
        )}
        {task.status === "queued" && task.startedAt && (
          <span className="inline-flex items-center gap-1 text-blue-400">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {elapsed}
          </span>
        )}
        {task.completedAt && (
          <span className="inline-flex items-center gap-1 text-green-400">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {formatTimestamp(task.completedAt)}
          </span>
        )}
      </div>
    </div>
  );
}
