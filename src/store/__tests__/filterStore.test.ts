import { describe, it, expect, beforeEach } from "vitest";
import { useFilterStore, taskMatchesFilter, isFilterActive } from "@/store/filterStore";
import type { Task } from "@/lib/types";

function makeTask(over: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "Task title",
    status: "todo",
    notes: "some notes",
    order: 0,
    createdAt: 1,
    ...over,
  };
}

describe("filterStore", () => {
  beforeEach(() => {
    useFilterStore.setState({ searchQuery: "", statusFilters: [], linkTypeFilters: [] });
  });

  it("defaults to no active filter", () => {
    expect(isFilterActive(useFilterStore.getState())).toBe(false);
  });

  it("toggleStatusFilter adds then removes", () => {
    useFilterStore.getState().toggleStatusFilter("queued");
    expect(useFilterStore.getState().statusFilters).toEqual(["queued"]);
    useFilterStore.getState().toggleStatusFilter("queued");
    expect(useFilterStore.getState().statusFilters).toEqual([]);
  });

  it("clearFilters resets everything", () => {
    useFilterStore.getState().setSearchQuery("foo");
    useFilterStore.getState().toggleStatusFilter("todo");
    useFilterStore.getState().toggleLinkTypeFilter("github");
    useFilterStore.getState().clearFilters();
    const s = useFilterStore.getState();
    expect(s.searchQuery).toBe("");
    expect(s.statusFilters).toEqual([]);
    expect(s.linkTypeFilters).toEqual([]);
  });

  describe("taskMatchesFilter", () => {
    it("passes through with no filters", () => {
      expect(
        taskMatchesFilter(makeTask(), { searchQuery: "", statusFilters: [], linkTypeFilters: [] })
      ).toBe(true);
    });

    it("searchQuery matches title", () => {
      expect(
        taskMatchesFilter(makeTask({ title: "Buy coffee" }), {
          searchQuery: "COFFEE",
          statusFilters: [],
          linkTypeFilters: [],
        })
      ).toBe(true);
    });

    it("searchQuery matches notes", () => {
      expect(
        taskMatchesFilter(makeTask({ title: "X", notes: "needs review" }), {
          searchQuery: "review",
          statusFilters: [],
          linkTypeFilters: [],
        })
      ).toBe(true);
    });

    it("searchQuery matches a link url", () => {
      expect(
        taskMatchesFilter(
          makeTask({ title: "X", notes: "", links: [{ id: "l", url: "https://github.com/x/y" }] }),
          { searchQuery: "github.com", statusFilters: [], linkTypeFilters: [] }
        )
      ).toBe(true);
    });

    it("statusFilters excludes non-matching", () => {
      expect(
        taskMatchesFilter(makeTask({ status: "todo" }), {
          searchQuery: "",
          statusFilters: ["done"],
          linkTypeFilters: [],
        })
      ).toBe(false);
    });

    it("linkTypeFilters require at least one matching link kind", () => {
      const task = makeTask({
        links: [
          { id: "a", url: "https://github.com/o/r" },
          { id: "b", url: "https://company.atlassian.net/browse/AB-1" },
        ],
      });
      expect(
        taskMatchesFilter(task, {
          searchQuery: "",
          statusFilters: [],
          linkTypeFilters: ["jira"],
        })
      ).toBe(true);
      expect(
        taskMatchesFilter(task, {
          searchQuery: "",
          statusFilters: [],
          linkTypeFilters: ["slack"],
        })
      ).toBe(false);
    });
  });
});
