export type TaskStatus = "queued" | "in-progress" | "review" | "done";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  notes: string;
  order: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
};

export type Column = {
  id: string;
  title: string;
  color: string;
  order: number;
  tasks: Task[];
};

export type Board = {
  id: string;
  columns: Column[];
};

export const COLUMN_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f97316", // orange
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#eab308", // yellow
  "#ef4444", // red
];

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bgColor: string; next: TaskStatus }
> = {
  queued: {
    label: "Queued",
    color: "#737373",
    bgColor: "#26262633",
    next: "in-progress",
  },
  "in-progress": {
    label: "In Progress",
    color: "#3b82f6",
    bgColor: "#3b82f620",
    next: "review",
  },
  review: {
    label: "Review",
    color: "#f59e0b",
    bgColor: "#f59e0b20",
    next: "done",
  },
  done: {
    label: "Done",
    color: "#10b981",
    bgColor: "#10b98120",
    next: "queued",
  },
};
