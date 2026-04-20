"use client";

import { useEffect } from "react";
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

  // Global undo/redo shortcuts. Skip when focus is in an editable field
  // so Cmd-Z inside an input is the browser's own undo.
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== "z") return;
      if (isEditable(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Cross-tab sync: another tab wrote to localStorage, mirror it here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && typeof parsed === "object" && Array.isArray(parsed.columns)) {
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

  if (board.columns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 pt-5">
        <EmptyState />
        <AddColumn compact />
      </div>
    );
  }

  const columnIds = board.columns.map((c) => `column-${c.id}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        <div className="flex flex-1 gap-4 overflow-x-auto p-4 pt-5">
          {board.columns.map((column) => (
            <Column key={column.id} column={column} />
          ))}
          <AddColumn />
        </div>
      </SortableContext>
    </DndContext>
  );
}
