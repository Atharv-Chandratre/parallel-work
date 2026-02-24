"use client";

import { useState, useRef, useEffect } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Column as ColumnType } from "@/lib/types";
import { useBoardStore } from "@/store/boardStore";
import TaskCard from "./TaskCard";
import AddTask from "./AddTask";

type ColumnProps = {
  column: ColumnType;
};

export default function Column({ column }: ColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [showDone, setShowDone] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const renameColumn = useBoardStore((s) => s.renameColumn);
  const deleteColumn = useBoardStore((s) => s.deleteColumn);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef } = useDroppable({
    id: `column-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const activeTasks = column.tasks.filter((t) => t.status !== "done");
  const doneTasks = column.tasks.filter((t) => t.status === "done");
  const taskIds = activeTasks.map((t) => t.id);

  const saveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== column.title) {
      renameColumn(column.id, trimmed);
    } else {
      setEditTitle(column.title);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-[var(--color-column-bg)] max-h-full">
      <div
        className="flex items-center gap-2 px-3 pt-3 pb-2"
        style={{ borderTop: `3px solid ${column.color}`, borderRadius: "12px 12px 0 0" }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setEditTitle(column.title);
                setIsEditing(false);
              }
            }}
            className="flex-1 bg-transparent text-sm font-semibold text-zinc-800 dark:text-zinc-100 outline-none border-b border-blue-500"
          />
        ) : (
          <h3
            onDoubleClick={() => setIsEditing(true)}
            className="flex-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200 cursor-default select-none truncate"
            title="Double-click to rename"
          >
            {column.title}
          </h3>
        )}
        <span className="text-xs text-zinc-500">
          {activeTasks.length}
        </span>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer p-0.5"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-6 z-20 w-36 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 py-1 shadow-xl">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setIsEditing(true);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Rename
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (
                      confirm(
                        `Delete "${column.title}" and all its tasks?`
                      )
                    ) {
                      deleteColumn(column.id);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-red-500 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="mb-2">
          <AddTask columnId={column.id} />
        </div>

        <SortableContext
          items={taskIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-1.5">
            {activeTasks.map((task) => (
              <TaskCard key={task.id} task={task} columnId={column.id} />
            ))}
          </div>
        </SortableContext>

        {doneTasks.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowDone(!showDone)}
              className="flex w-full items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer py-1"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform ${showDone ? "rotate-90" : ""}`}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              Done ({doneTasks.length})
            </button>
            {showDone && (
              <div className="mt-1 flex flex-col gap-1.5">
                {doneTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    columnId={column.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
