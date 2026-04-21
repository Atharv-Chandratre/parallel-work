import { describe, it, expect } from "vitest";
import { getShortcutGroups, formatShortcutForPill } from "@/lib/shortcuts";

describe("getShortcutGroups", () => {
  it("uses the ⌘ glyph on Mac and the Ctrl label elsewhere", () => {
    const macGroups = getShortcutGroups(true);
    const winGroups = getShortcutGroups(false);
    const macGlobal = macGroups.find((g) => g.title === "Global")!;
    const winGlobal = winGroups.find((g) => g.title === "Global")!;
    const macK = macGlobal.shortcuts.find((s) => s.description.includes("command palette"))!;
    const winK = winGlobal.shortcuts.find((s) => s.description.includes("command palette"))!;
    expect(macK.keys).toEqual(["⌘", "K"]);
    expect(winK.keys).toEqual(["Ctrl", "K"]);
  });

  it("includes every documented global binding", () => {
    const groups = getShortcutGroups(true);
    const globalDescriptions = groups
      .find((g) => g.title === "Global")!
      .shortcuts.map((s) => s.description.toLowerCase());
    expect(globalDescriptions).toEqual(
      expect.arrayContaining([
        expect.stringContaining("command palette"),
        expect.stringContaining("undo"),
        expect.stringContaining("redo"),
        expect.stringContaining("shortcuts dialog"),
      ])
    );
  });

  it("lists the four expected groups", () => {
    const titles = getShortcutGroups(true).map((g) => g.title);
    expect(titles).toEqual(["Global", "Command palette", "Confirm dialog", "Tasks & projects"]);
  });
});

describe("formatShortcutForPill", () => {
  it("returns ⌘K on Mac", () => {
    expect(formatShortcutForPill(true)).toEqual({ keys: ["⌘", "K"], label: "⌘K" });
  });

  it("returns Ctrl+K elsewhere", () => {
    expect(formatShortcutForPill(false)).toEqual({ keys: ["Ctrl", "K"], label: "Ctrl+K" });
  });
});
