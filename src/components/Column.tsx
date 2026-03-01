"use client";

import { useState, useRef, useEffect } from "react";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Column as ColumnType } from "@/lib/types";
import { useBoardStore } from "@/store/boardStore";
import TaskCard from "./TaskCard";
import AddTask from "./AddTask";

type ColumnProps = {
  column: ColumnType;
};

function ColumnProgressBar({ column }: { column: ColumnType }) {
  const total = column.tasks.length;
  if (total === 0) return null;

  const counts = {
    todo: column.tasks.filter((t) => t.status === "todo").length,
    queued: column.tasks.filter((t) => t.status === "queued").length,
    "in-review": column.tasks.filter((t) => t.status === "in-review").length,
    done: column.tasks.filter((t) => t.status === "done").length,
  };

  const segments = [
    { key: "done", color: "#10b981", count: counts.done },
    { key: "in-review", color: "#3b82f6", count: counts["in-review"] },
    { key: "queued", color: "#eab308", count: counts.queued },
    { key: "todo", color: "#737373", count: counts.todo },
  ].filter((s) => s.count > 0);

  return (
    <div
      className="flex h-1 w-full gap-px overflow-hidden rounded-full mx-3 mb-1.5"
      style={{ maxWidth: "calc(100% - 24px)" }}
    >
      {segments.map((seg) => (
        <div
          key={seg.key}
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${(seg.count / total) * 100}%`,
            backgroundColor: seg.color,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

export default function Column({ column }: ColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [showDone, setShowDone] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const renameColumn = useBoardStore((s) => s.renameColumn);
  const deleteColumn = useBoardStore((s) => s.deleteColumn);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `column-droppable-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
    <div
      ref={setSortableRef}
      style={style}
      className={`flex w-72 shrink-0 flex-col rounded-xl bg-[var(--color-column-bg)] shadow-sm dark:shadow-none max-h-full ${isDragging ? "opacity-50 shadow-lg z-50" : ""}`}
    >
      <div
        className="flex items-center gap-2 px-3 pt-3 pb-2 cursor-grab active:cursor-grabbing"
        style={{ borderTop: `4px solid ${column.color}`, borderRadius: "12px 12px 0 0" }}
        {...attributes}
        {...listeners}
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
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Project name..."
            className="flex-1 min-w-0 rounded-lg bg-[var(--color-card-bg)] px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none border border-[var(--color-card-border)] focus:border-blue-500 cursor-text"
          />
        ) : (
          <h3
            onDoubleClick={() => setIsEditing(true)}
            className="flex-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200 cursor-grab select-none truncate"
            title="Double-click to rename, drag to reorder"
          >
            {column.title}
          </h3>
        )}
        <span className="text-xs text-zinc-500">{activeTasks.length}</span>
        <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-md p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
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
                    if (confirm(`Delete "${column.title}" and all its tasks?`)) {
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

      <ColumnProgressBar column={column} />

      <div ref={setDroppableRef} className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="mb-2">
          <AddTask columnId={column.id} />
        </div>

        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
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
                  <TaskCard key={task.id} task={task} columnId={column.id} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
