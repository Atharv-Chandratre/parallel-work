"use client";

import { useState, useEffect } from "react";
import { Task } from "@/lib/types";
import { useBoardStore } from "@/store/boardStore";
import LinkIcon from "./LinkIcon";

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

function LinkRow({
  initialUrl,
  onSave,
  onRemove,
}: {
  initialUrl: string;
  onSave: (url: string) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState(initialUrl);
  useEffect(() => {
    setValue(initialUrl);
  }, [initialUrl]);
  const commit = () => {
    const trimmed = value.trim();
    if (trimmed === initialUrl) return;
    onSave(trimmed);
  };
  return (
    <div className="flex items-center gap-1">
      <span className="w-[11px] shrink-0 text-zinc-400">
        <LinkIcon url={value} size={11} />
      </span>
      <input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="flex-1 rounded-md bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-400/20 dark:focus:ring-blue-500/20 transition-all"
      />
      <button
        onClick={onRemove}
        aria-label="Remove link"
        title="Remove link"
        className="rounded p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
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
}

export default function TaskDetail({ task, columnId }: TaskDetailProps) {
  const [notes, setNotes] = useState(task.notes);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const updateTask = useBoardStore((s) => s.updateTask);
  const addTaskLink = useBoardStore((s) => s.addTaskLink);
  const updateTaskLink = useBoardStore((s) => s.updateTaskLink);
  const removeTaskLink = useBoardStore((s) => s.removeTaskLink);
  const links = task.links ?? [];
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

  const submitNewLink = () => {
    const trimmed = newLinkUrl.trim();
    if (!trimmed) return;
    addTaskLink(columnId, task.id, trimmed);
    setNewLinkUrl("");
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
          <LinkIcon url={links[0]?.url ?? ""} size={11} />
          Links
        </label>
        <div className="flex flex-col gap-1">
          {links.map((link) => (
            <LinkRow
              key={link.id}
              initialUrl={link.url}
              onSave={(url) => updateTaskLink(columnId, task.id, link.id, url)}
              onRemove={() => removeTaskLink(columnId, task.id, link.id)}
            />
          ))}
          <div className="flex items-center gap-1">
            <span className="w-[11px] shrink-0 text-zinc-400">
              <LinkIcon url={newLinkUrl} size={11} />
            </span>
            <input
              type="url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              onBlur={submitNewLink}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitNewLink();
                }
              }}
              placeholder={
                links.length > 0 ? "Add another link..." : "Paste GitHub / Jira / Slack link..."
              }
              className="flex-1 rounded-md bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-400/20 dark:focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>
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
