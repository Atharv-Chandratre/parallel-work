"use client";

import { TaskStatus, STATUS_CONFIG } from "@/lib/types";

type StatusBadgeProps = {
  status: TaskStatus;
  onClick?: (e: React.MouseEvent) => void;
};

export default function StatusBadge({ status, onClick }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <button
      onClick={onClick}
      title={`Status: ${config.label} (click to advance)`}
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer select-none"
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${status === "in-progress" ? "animate-pulse" : ""}`}
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </button>
  );
}
