"use client";

import { TaskStatus, STATUS_CONFIG } from "@/lib/types";

type StatusBadgeProps = {
  status: TaskStatus;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium select-none whitespace-nowrap"
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
      title={`Status: ${config.label}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${status === "queued" ? "animate-pulse" : ""}`}
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
