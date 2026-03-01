"use client";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 px-8 text-center max-w-md mx-auto animate-[fadeIn_0.5s_ease-out]">
      <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 p-4">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="url(#emptyGrad)"
          strokeWidth="1.5"
        >
          <defs>
            <linearGradient id="emptyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">No projects yet</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
        Create your first project to start tracking parallel work. Each project becomes a column
        where you can queue up tasks, mark what your agents are working on, and track what needs
        review.
      </p>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Click the{" "}
        <span className="font-medium text-zinc-600 dark:text-zinc-300">
          &quot;+ Add Project&quot;
        </span>{" "}
        button below to get started
      </p>
    </div>
  );
}
