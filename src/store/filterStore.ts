import { create } from "zustand";
import { Task, TaskStatus } from "@/lib/types";
import { getLinkType, type LinkType } from "@/lib/linkUtils";

type FilterState = {
  searchQuery: string;
  statusFilters: TaskStatus[];
  linkTypeFilters: LinkType[];

  setSearchQuery: (query: string) => void;
  toggleStatusFilter: (status: TaskStatus) => void;
  toggleLinkTypeFilter: (kind: LinkType) => void;
  clearFilters: () => void;
};

export const useFilterStore = create<FilterState>((set) => ({
  searchQuery: "",
  statusFilters: [],
  linkTypeFilters: [],

  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleStatusFilter: (status) =>
    set((s) => ({
      statusFilters: s.statusFilters.includes(status)
        ? s.statusFilters.filter((x) => x !== status)
        : [...s.statusFilters, status],
    })),
  toggleLinkTypeFilter: (kind) =>
    set((s) => ({
      linkTypeFilters: s.linkTypeFilters.includes(kind)
        ? s.linkTypeFilters.filter((x) => x !== kind)
        : [...s.linkTypeFilters, kind],
    })),
  clearFilters: () => set({ searchQuery: "", statusFilters: [], linkTypeFilters: [] }),
}));

export function taskMatchesFilter(
  task: Task,
  state: Pick<FilterState, "searchQuery" | "statusFilters" | "linkTypeFilters">
): boolean {
  const q = state.searchQuery.trim().toLowerCase();
  if (q) {
    const inTitle = task.title.toLowerCase().includes(q);
    const inNotes = task.notes.toLowerCase().includes(q);
    const inLinks = (task.links ?? []).some((l) => l.url.toLowerCase().includes(q));
    if (!inTitle && !inNotes && !inLinks) return false;
  }
  if (state.statusFilters.length > 0 && !state.statusFilters.includes(task.status)) {
    return false;
  }
  if (state.linkTypeFilters.length > 0) {
    const kinds = new Set((task.links ?? []).map((l) => getLinkType(l.url)));
    if (!state.linkTypeFilters.some((k) => kinds.has(k))) return false;
  }
  return true;
}

export function isFilterActive(
  state: Pick<FilterState, "searchQuery" | "statusFilters" | "linkTypeFilters">
): boolean {
  return (
    state.searchQuery.trim().length > 0 ||
    state.statusFilters.length > 0 ||
    state.linkTypeFilters.length > 0
  );
}
