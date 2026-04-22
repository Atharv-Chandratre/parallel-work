"use client";

import { useEffect, useRef, useState } from "react";
import CommandPalette from "./CommandPalette";
import { useUiStore } from "@/store/uiStore";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useBoardStore } from "@/store/boardStore";
import { STORAGE_KEY } from "@/lib/storage";
import Column from "./Column";
import AddColumn from "./AddColumn";
import EmptyState from "./EmptyState";

export default function Board() {
  const { board, initialized, initialize, reorderTask, moveTaskBetweenColumns, moveColumn } =
    useBoardStore();
  const setExpandedTaskId = useBoardStore((s) => s.setExpandedTaskId);
  const flushPendingSave = useBoardStore((s) => s.flushPendingSave);
  const hydrateFromStorage = useBoardStore((s) => s.hydrateFromStorage);
  const undo = useBoardStore((s) => s.undo);
  const redo = useBoardStore((s) => s.redo);
  const paletteOpen = useUiStore((s) => s.isCommandPaletteOpen);
  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette);
  const closeCommandPalette = useUiStore((s) => s.closeCommandPalette);
  const openShortcuts = useUiStore((s) => s.openShortcuts);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-task-card]")) {
        // Blur any focused input inside the detail so pending changes are saved
        // via onBlur handlers before the detail unmounts.
        (document.activeElement as HTMLElement | null)?.blur?.();
        setExpandedTaskId(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [setExpandedTaskId]);

  // Flush debounced save on tab close / hide to avoid losing in-flight edits.
  useEffect(() => {
    const onHide = () => flushPendingSave();
    window.addEventListener("beforeunload", onHide);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushPendingSave();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flushPendingSave]);

  // Global keyboard shortcuts. Skip Cmd-Z when focus is in an editable
  // field so the browser's native undo in that field still works.
  // Cmd-K opens the command palette regardless of focus.
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        if (isEditable(e.target)) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      // `?` opens the keyboard shortcuts help. Skip when typing in inputs so
      // `Shift+/` in a notes textarea still produces a literal `?`.
      if (e.key === "?" && !isEditable(e.target)) {
        e.preventDefault();
        openShortcuts();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [undo, redo, toggleCommandPalette, openShortcuts]);

  // Cross-tab sync: another tab wrote to localStorage, mirror it here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.activeBoardId === "string" &&
          parsed.boards
        ) {
          hydrateFromStorage(parsed);
        }
      } catch {
        // ignore malformed payloads from other tabs
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrateFromStorage]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  if (!initialized) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    );
  }

  const findColumnAndIndex = (taskId: string) => {
    for (const col of board.columns) {
      const activeTasks = col.tasks.filter((t) => t.status !== "done");
      const idx = activeTasks.findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        const realIdx = col.tasks.findIndex((t) => t.id === taskId);
        return { column: col, index: realIdx, activeIndex: idx };
      }
    }
    return null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== "task") return;

    const activeResult = findColumnAndIndex(active.id as string);
    if (!activeResult) return;

    let overColumnId: string;
    let overIndex: number;

    if (overData?.type === "column") {
      overColumnId = overData.columnId;
      const overCol = board.columns.find((c) => c.id === overColumnId);
      overIndex = overCol ? overCol.tasks.filter((t) => t.status !== "done").length : 0;
    } else if (overData?.type === "task") {
      const overResult = findColumnAndIndex(over.id as string);
      if (!overResult) return;
      overColumnId = overResult.column.id;
      overIndex = overResult.index;
    } else {
      return;
    }

    if (activeResult.column.id !== overColumnId) {
      moveTaskBetweenColumns(activeResult.column.id, overColumnId, activeResult.index, overIndex);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === "column" && overData?.type === "column") {
      const fromIndex = board.columns.findIndex((c) => `column-${c.id}` === active.id);
      const toIndex = board.columns.findIndex((c) => `column-${c.id}` === over.id);
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        moveColumn(fromIndex, toIndex);
      }
      return;
    }

    if (activeData?.type !== "task") return;

    const activeResult = findColumnAndIndex(active.id as string);
    const overResult = findColumnAndIndex(over.id as string);

    if (!activeResult || !overResult) return;

    if (activeResult.column.id === overResult.column.id) {
      reorderTask(activeResult.column.id, activeResult.index, overResult.index);
    }
  };

  const visibleColumns = board.columns.filter((c) => !c.hidden);
  const hiddenColumns = board.columns.filter((c) => c.hidden);

  if (visibleColumns.length === 0 && hiddenColumns.length === 0) {
    return (
      <>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 pt-5">
          <EmptyState />
          <AddColumn compact />
        </div>
        {paletteOpen && <CommandPalette onClose={closeCommandPalette} />}
      </>
    );
  }

  const columnIds = visibleColumns.map((c) => `column-${c.id}`);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-1 gap-4 overflow-x-auto p-4 pt-5">
            {visibleColumns.map((column) => (
              <Column key={column.id} column={column} />
            ))}
            <div className="flex flex-col gap-2 shrink-0">
              {hiddenColumns.length > 0 && <HiddenColumnsPanel columns={hiddenColumns} />}
              <AddColumn />
            </div>
          </div>
        </SortableContext>
      </DndContext>
      {paletteOpen && <CommandPalette onClose={closeCommandPalette} />}
    </>
  );
}

function HiddenColumnsPanel({
  columns,
}: {
  columns: { id: string; title: string; color: string }[];
}) {
  const [open, setOpen] = useState(false);
  const toggleColumnHidden = useBoardStore((s) => s.toggleColumnHidden);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex w-full items-center justify-between gap-2 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <span>Hidden projects ({columns.length})</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
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
            Hidden Projects
          </div>
          {columns.map((c) => (
            <div
              key={c.id}
              className="group flex items-center gap-2 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200"
            >
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <span className="flex-1 truncate italic">{c.title}</span>
              <button
                onClick={() => toggleColumnHidden(c.id)}
                title="Unhide project"
                aria-label={`Unhide project ${c.title}`}
                className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Unhide
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
