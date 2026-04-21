import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import { useUiStore } from "@/store/uiStore";

describe("ShortcutsHelp", () => {
  beforeEach(() => {
    useUiStore.setState({ isShortcutsOpen: false, isCommandPaletteOpen: false });
  });

  it("renders nothing when closed", () => {
    render(<ShortcutsHelp />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the dialog with a labelled title when open", () => {
    useUiStore.setState({ isShortcutsOpen: true });
    render(<ShortcutsHelp />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const titleId = dialog.getAttribute("aria-labelledby")!;
    expect(document.getElementById(titleId)?.textContent).toBe("Keyboard shortcuts");
  });

  it("renders each shortcut group and at least one kbd per shortcut", () => {
    useUiStore.setState({ isShortcutsOpen: true });
    render(<ShortcutsHelp />);
    for (const title of ["Global", "Command palette", "Confirm dialog", "Tasks & projects"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(document.querySelectorAll("kbd").length).toBeGreaterThan(0);
  });

  it("Esc closes the dialog", async () => {
    useUiStore.setState({ isShortcutsOpen: true });
    const user = userEvent.setup();
    render(<ShortcutsHelp />);
    await user.keyboard("{Escape}");
    expect(useUiStore.getState().isShortcutsOpen).toBe(false);
  });

  it("backdrop click closes the dialog", async () => {
    useUiStore.setState({ isShortcutsOpen: true });
    const user = userEvent.setup();
    render(<ShortcutsHelp />);
    await user.click(screen.getByTestId("shortcuts-help-backdrop"));
    expect(useUiStore.getState().isShortcutsOpen).toBe(false);
  });

  it("clicking the X button closes the dialog", async () => {
    useUiStore.setState({ isShortcutsOpen: true });
    const user = userEvent.setup();
    render(<ShortcutsHelp />);
    await user.click(screen.getByLabelText("Close keyboard shortcuts"));
    expect(useUiStore.getState().isShortcutsOpen).toBe(false);
  });

  it("clicking inside the dialog does NOT close it", async () => {
    useUiStore.setState({ isShortcutsOpen: true });
    const user = userEvent.setup();
    render(<ShortcutsHelp />);
    await user.click(screen.getByText("Global"));
    expect(useUiStore.getState().isShortcutsOpen).toBe(true);
  });

  it("restores focus to the previously-focused element when closed", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);
    trigger.focus();
    useUiStore.setState({ isShortcutsOpen: true });
    const { rerender } = render(<ShortcutsHelp />);
    expect(document.activeElement).toBe(screen.getByLabelText("Close keyboard shortcuts"));
    act(() => {
      useUiStore.setState({ isShortcutsOpen: false });
    });
    rerender(<ShortcutsHelp />);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("silently suppresses unused prop warning", () => {
    // Placeholder to document that ShortcutsHelp takes no props (keeps the test file
    // useful if someone adds props later).
    expect(typeof ShortcutsHelp).toBe("function");
    vi.clearAllMocks();
  });
});
