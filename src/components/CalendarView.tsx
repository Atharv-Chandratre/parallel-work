"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useBoardStore } from "@/store/boardStore";
import { useUiStore } from "@/store/uiStore";
import { Task, STATUS_CONFIG } from "@/lib/types";

type TaskEntry = { task: Task; columnId: string; columnTitle: string };

function toDateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromDateKey(key: string): number {
  return new Date(key + "T00:00:00").getTime();
}

function todayKey(): string {
  return toDateKey(Date.now());
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function TaskChip({ entry, onClick }: { entry: TaskEntry; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: entry.task.id,
    data: { columnId: entry.columnId, task: entry.task },
  });
  const cfg = STATUS_CONFIG[entry.task.status];
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      onClick={onClick}
      title={`${entry.task.title} · ${entry.columnTitle}`}
      className={`w-full rounded text-left text-[10px] leading-tight px-1 py-0.5 truncate border-l-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-0" : ""
      }`}
      style={{ borderLeftColor: cfg.color }}
    >
      {entry.task.title}
    </button>
  );
}

function DayCell({
  dateKey,
  day,
  isCurrentMonth,
  isToday,
  entries,
  onTaskClick,
}: {
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  entries: TaskEntry[];
  onTaskClick: (entry: TaskEntry) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-1 p-1.5 min-h-[80px] bg-[var(--color-column-bg)] transition-colors ${
        !isCurrentMonth ? "opacity-40" : ""
      } ${isToday ? "ring-2 ring-inset ring-blue-500" : ""} ${
        isOver ? "bg-blue-50 dark:bg-blue-950/30" : ""
      }`}
    >
      <span
        className={`text-[11px] font-semibold leading-none ${
          isToday
            ? "flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white"
            : "text-zinc-500 dark:text-zinc-400"
        }`}
      >
        {day}
      </span>
      {entries.map((entry) => (
        <TaskChip key={entry.task.id} entry={entry} onClick={() => onTaskClick(entry)} />
      ))}
    </div>
  );
}

function GhostChip({ entry }: { entry: TaskEntry }) {
  const cfg = STATUS_CONFIG[entry.task.status];
  return (
    <div
      className="rounded text-left text-[10px] leading-tight px-1 py-0.5 truncate border-l-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-lg opacity-90 max-w-[160px]"
      style={{ borderLeftColor: cfg.color }}
    >
      {entry.task.title}
    </div>
  );
}

export default function CalendarView() {
  const columns = useBoardStore((s) => s.board.columns);
  const updateTask = useBoardStore((s) => s.updateTask);
  const setExpandedTaskId = useBoardStore((s) => s.setExpandedTaskId);
  const setViewMode = useUiStore((s) => s.setViewMode);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [activeEntry, setActiveEntry] = useState<TaskEntry | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const taskMap = useMemo(() => {
    const map = new Map<string, TaskEntry[]>();
    for (const col of columns) {
      for (const task of col.tasks) {
        if (!task.dueDate) continue;
        const key = toDateKey(task.dueDate);
        const existing = map.get(key) ?? [];
        existing.push({ task, columnId: col.id, columnTitle: col.title });
        map.set(key, existing);
      }
    }
    return map;
  }, [columns]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { dateKey: string; day: number; isCurrentMonth: boolean }[] = [];

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const key = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dateKey: key, day: d, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dateKey: key, day: d, isCurrentMonth: true });
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      for (let d = 1; d <= remaining; d++) {
        const key = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        days.push({ dateKey: key, day: d, isCurrentMonth: false });
      }
    }

    return days;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };
  const goToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  };

  const handleTaskClick = (entry: TaskEntry) => {
    setExpandedTaskId(entry.task.id);
    setViewMode("board");
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { columnId: string; task: Task } | undefined;
    if (!data) return;
    const col = columns.find((c) => c.id === data.columnId);
    setActiveEntry({ task: data.task, columnId: data.columnId, columnTitle: col?.title ?? "" });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveEntry(null);
    const { active, over } = event;
    if (!over) return;
    const data = active.data.current as { columnId: string; task: Task } | undefined;
    if (!data) return;
    const newDateKey = over.id as string;
    const newDueDate = fromDateKey(newDateKey);
    if (data.task.dueDate === newDueDate) return;
    updateTask(data.columnId, data.task.id, { dueDate: newDueDate });
  };

  const today = todayKey();

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 flex-col overflow-hidden bg-[var(--color-column-bg)] p-4">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous month"
            className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 min-w-[160px] text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next month"
            className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToday}
            className="ml-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 flex-1 gap-px bg-zinc-200 dark:bg-zinc-700 rounded-xl overflow-auto">
          {calendarDays.map(({ dateKey, day, isCurrentMonth }) => (
            <DayCell
              key={dateKey}
              dateKey={dateKey}
              day={day}
              isCurrentMonth={isCurrentMonth}
              isToday={dateKey === today}
              entries={taskMap.get(dateKey) ?? []}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>
      </div>

      <DragOverlay>{activeEntry ? <GhostChip entry={activeEntry} /> : null}</DragOverlay>
    </DndContext>
  );
}
