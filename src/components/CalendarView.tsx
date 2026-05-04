"use client";

import { useState, useMemo } from "react";
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

export default function CalendarView() {
  const columns = useBoardStore((s) => s.board.columns);
  const setExpandedTaskId = useBoardStore((s) => s.setExpandedTaskId);
  const setViewMode = useUiStore((s) => s.setViewMode);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

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
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { dateKey: string; day: number; isCurrentMonth: boolean }[] = [];

    // Pad with days from previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const key = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dateKey: key, day: d, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dateKey: key, day: d, isCurrentMonth: true });
    }

    // Pad to complete last row (multiple of 7)
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

  const today = todayKey();

  return (
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
        {calendarDays.map(({ dateKey, day, isCurrentMonth }) => {
          const entries = taskMap.get(dateKey) ?? [];
          const isToday = dateKey === today;
          return (
            <div
              key={dateKey}
              className={`flex flex-col gap-1 p-1.5 min-h-[80px] bg-[var(--color-column-bg)] ${
                !isCurrentMonth ? "opacity-40" : ""
              } ${isToday ? "ring-2 ring-inset ring-blue-500" : ""}`}
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
              {entries.map(({ task, columnId, columnTitle }) => {
                const cfg = STATUS_CONFIG[task.status];
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleTaskClick({ task, columnId, columnTitle })}
                    title={`${task.title} · ${columnTitle}`}
                    className="w-full rounded text-left text-[10px] leading-tight px-1 py-0.5 truncate border-l-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    style={{ borderLeftColor: cfg.color }}
                  >
                    {task.title}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
