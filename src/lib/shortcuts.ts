export type Shortcut = {
  keys: string[];
  description: string;
};

export type ShortcutGroup = {
  title: string;
  shortcuts: Shortcut[];
};

/**
 * Canonical list of keyboard shortcuts the app supports. Used by the
 * ShortcutsHelp dialog and the `⌘K` / `Ctrl+K` header pill. Any new
 * keyboard binding added to the app should be reflected here.
 */
export function getShortcutGroups(isMac: boolean): ShortcutGroup[] {
  const Mod = isMac ? "⌘" : "Ctrl";
  return [
    {
      title: "Global",
      shortcuts: [
        { keys: [Mod, "K"], description: "Open the command palette" },
        { keys: [Mod, "Z"], description: "Undo last change" },
        { keys: ["Shift", Mod, "Z"], description: "Redo" },
        { keys: ["?"], description: "Show this shortcuts dialog" },
      ],
    },
    {
      title: "Command palette",
      shortcuts: [
        { keys: ["↑", "↓"], description: "Move between commands" },
        { keys: ["Enter"], description: "Run the highlighted command" },
        { keys: ["Esc"], description: "Close the palette" },
      ],
    },
    {
      title: "Confirm dialog",
      shortcuts: [
        { keys: ["Esc"], description: "Cancel" },
        { keys: ["Tab"], description: "Move to next button" },
        { keys: ["Shift", "Tab"], description: "Move to previous button" },
      ],
    },
    {
      title: "Tasks & projects",
      shortcuts: [
        { keys: ["Double-click"], description: "Rename a task or project title" },
        { keys: ["Enter"], description: "Save rename / add" },
        { keys: ["Esc"], description: "Cancel rename / add" },
        { keys: ["Click"], description: "Expand a task; click outside to collapse" },
      ],
    },
  ];
}

export function formatShortcutForPill(isMac: boolean): { keys: string[]; label: string } {
  return isMac ? { keys: ["⌘", "K"], label: "⌘K" } : { keys: ["Ctrl", "K"], label: "Ctrl+K" };
}
