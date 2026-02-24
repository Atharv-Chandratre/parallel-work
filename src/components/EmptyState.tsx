"use client";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 px-8 text-center max-w-md mx-auto">
      <div className="text-4xl">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-zinc-600"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-zinc-300">
        No projects yet
      </h2>
      <p className="text-sm text-zinc-500 leading-relaxed">
        Create your first project to start tracking parallel work. Each
        project becomes a column where you can queue up tasks, mark what
        your agents are working on, and track what needs review.
      </p>
      <div className="mt-2 text-xs text-zinc-600 space-y-1">
        <p>
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono text-[10px]">
            Click
          </kbd>{" "}
          the &quot;+ Add Project&quot; button to get started
        </p>
      </div>
    </div>
  );
}
